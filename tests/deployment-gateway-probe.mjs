import { request as httpRequest } from "node:http";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const host = "deployment-validation.invalid";
const target = process.env.PROBE_TARGET ?? "shouban-gateway";
const mode = process.env.PROBE_MODE ?? "trusted";
const markers = {
  Host: host,
  Authorization: "Bearer SYNTHETIC_AUTH_HEADER",
  Cookie: "audit=SYNTHETIC_COOKIE_VALUE",
  "X-Forwarded-For": "203.0.113.41",
  "X-Forwarded-Proto": "https",
  "X-Deployment-Audit": "SYNTHETIC_REQUEST_HEADER"
};

function check(condition, code, status) {
  if (!condition) {
    const error = new Error(code);
    if (Number.isInteger(status) && status >= 100 && status <= 599) error.status = status;
    throw error;
  }
}

// Native fetch deliberately ignores a user-supplied Host header in Node 24.
// These isolated ALB probes must send the real canonical Host without changing
// DNS, so use HTTP directly. No redirects, external hosts or unbounded bodies.
export async function requestGateway(path, options = {}, connection = {}) {
  const hostname = connection.target ?? target;
  const port = connection.port ?? 8080;
  const timeoutMs = connection.timeoutMs ?? 5000;
  const maxResponseBytes = connection.maxResponseBytes ?? 32768;
  const allowedTargets = ["shouban-gateway", "shouban-gateway-untrusted", "shouban-maintenance", "shouban-website", "127.0.0.1", "::1", "localhost"];
  if (!allowedTargets.includes(hostname) || !Number.isInteger(port) || port < 1 || port > 65535 ||
      typeof path !== "string" || !/^\/(?!\/)/.test(path) || /[\r\n\0]/.test(path) ||
      !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 5000 ||
      !Number.isInteger(maxResponseBytes) || maxResponseBytes < 1 || maxResponseBytes > 32768 ||
      !["GET", "POST"].includes(options.method ?? "GET") ||
      (options.body !== undefined && typeof options.body !== "string" && !(options.body instanceof Uint8Array))) {
    throw new Error("CI_GATEWAY_REQUEST_INPUT_INVALID");
  }
  const body = options.body === undefined ? undefined : Buffer.from(options.body);
  if (body && body.byteLength > 32768) throw new Error("CI_GATEWAY_REQUEST_INPUT_INVALID");
  return new Promise((resolveResponse, reject) => {
    let outgoing;
    let incoming;
    let finished = false;
    const fail = (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(deadline);
      incoming?.destroy();
      outgoing?.destroy();
      reject(new Error(code));
    };
    // A total deadline, never reset by headers or a continuously active body.
    const deadline = setTimeout(() => fail("CI_GATEWAY_REQUEST_DEADLINE"), timeoutMs);
    try {
      outgoing = httpRequest({
        hostname, port, path, method: options.method ?? "GET", agent: false,
        headers: { ...options.headers, ...(body ? { "Content-Length": String(body.byteLength) } : {}) }
      }, (response) => {
        incoming = response;
        const status = response.statusCode ?? 0;
        if (status >= 300 && status < 400) return fail("CI_GATEWAY_REDIRECT_FORBIDDEN");
        if (status < 200 || status > 599) return fail("CI_GATEWAY_RESPONSE_STATUS_INVALID");
        if (Number(response.headers["content-length"] ?? 0) > maxResponseBytes) return fail("CI_GATEWAY_RESPONSE_TOO_LARGE");
        const chunks = [];
        let size = 0;
        response.on("data", (chunk) => {
          if (finished) return;
          size += chunk.byteLength;
          if (size > maxResponseBytes) return fail("CI_GATEWAY_RESPONSE_TOO_LARGE");
          chunks.push(chunk);
        });
        response.on("aborted", () => fail("CI_GATEWAY_RESPONSE_FAILED"));
        response.on("error", () => fail("CI_GATEWAY_RESPONSE_FAILED"));
        response.on("end", () => {
          if (finished) return;
          try {
            const headers = new Headers();
            for (const [name, value] of Object.entries(response.headers)) {
              for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) headers.append(name, item);
            }
            const result = new Response([204, 205, 304].includes(status) ? null : Buffer.concat(chunks), { status, headers });
            finished = true;
            clearTimeout(deadline);
            resolveResponse(result);
          } catch { fail("CI_GATEWAY_RESPONSE_FAILED"); }
        });
      });
      outgoing.on("error", () => fail("CI_GATEWAY_REQUEST_FAILED"));
      outgoing.end(body);
    } catch { fail("CI_GATEWAY_REQUEST_FAILED"); }
  });
}

async function request(path, options = {}) {
  return requestGateway(path, { ...options, headers: { ...markers, ...options.headers } });
}

async function main() {
 try {
  check(["trusted", "untrusted", "maintenance", "failure"].includes(mode), "CI_GATEWAY_MODE_INVALID");
  if (mode === "untrusted") {
    const response = await request("/?audit_query=SYNTHETIC_QUERY_VALUE");
    check(response.status === 403, "CI_GATEWAY_UNTRUSTED_SOURCE_ACCEPTED");
  } else if (mode === "maintenance") {
    const response = await request("/?audit_query=SYNTHETIC_QUERY_VALUE");
    check(response.status === 503, "CI_GATEWAY_MAINTENANCE_STATUS_INVALID");
    check(response.headers.get("cache-control")?.includes("no-store"), "CI_GATEWAY_MAINTENANCE_CACHE_INVALID");
    check((await request("/", { headers: { Host: "wrong.invalid" } })).status === 403,
      "CI_GATEWAY_MAINTENANCE_HOST_ACCEPTED");
  } else if (mode === "failure") {
    const response = await request("/?audit_query=SYNTHETIC_QUERY_VALUE");
    await response.arrayBuffer();
    check(response.status === 502, "CI_GATEWAY_FAILURE_STATUS_INVALID");
  } else {
    const root = await request("/?audit_query=SYNTHETIC_QUERY_VALUE");
    check(root.status === 200, "CI_GATEWAY_ROOT_STATUS_INVALID", root.status);
    const body = await root.json();
    check(body.proto === "https" && body.host === host, "CI_GATEWAY_FORWARDED_PROTOCOL_INVALID");
    check((await request("/", { headers: { Host: "wrong.invalid" } })).status === 403,
      "CI_GATEWAY_HOST_ACCEPTED");
    for (const path of ["/contact", "/privacy", "/api/contact"]) {
      const response = await request(path);
      const cache = response.headers.get("cache-control") ?? "";
      check(response.status === 200 && cache.includes("private") && cache.includes("no-store"),
        "CI_GATEWAY_NO_STORE_INVALID");
    }
    const count = async () => {
      const response = await requestGateway("/__hits", {}, { target: "shouban-website", port: 3000 });
      return (await response.json()).hits;
    };
    const before = await count();
    const oversized = await request("/api/contact?audit_query=SYNTHETIC_CONTACT_QUERY", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "CI_OVERSIZED_BODY_SENTINEL" + "x".repeat(17_000)
    });
    check(oversized.status === 413 && await count() === before, "CI_GATEWAY_BODY_CAP_INVALID");
    const small = await request("/api/contact", {
      method: "POST",
      body: "SYNTHETIC_REQUEST_BODY"
    });
    check(small.status === 200 && await count() === before + 1, "CI_GATEWAY_SMALL_BODY_FAILED");
  }
  process.stdout.write(`CI_GATEWAY_${mode.toUpperCase()}_OK\n`);
} catch (error) {
  const code = typeof error?.message === "string" && /^CI_GATEWAY_[A-Z_]+$/.test(error.message)
    ? error.message : "CI_GATEWAY_PROBE_FAILED";
  const status = Number.isInteger(error?.status) && error.status >= 100 && error.status <= 599 ? ` status=${error.status}` : "";
  process.stderr.write(`${code}${status}\n`);
  process.exitCode = 1;
 }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await main();
