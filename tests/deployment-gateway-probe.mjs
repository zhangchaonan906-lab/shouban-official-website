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

function check(condition, code) {
  if (!condition) throw new Error(code);
}

async function request(path, options = {}) {
  const response = await fetch(`http://${target}:8080${path}`, {
    ...options,
    headers: { ...markers, ...options.headers },
    signal: AbortSignal.timeout(5000),
    redirect: "manual"
  });
  return response;
}

try {
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
    check(root.status === 200, "CI_GATEWAY_ROOT_STATUS_INVALID");
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
      const response = await fetch("http://shouban-website:3000/__hits", { signal: AbortSignal.timeout(5000) });
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
  process.stderr.write(`${code}\n`);
  process.exitCode = 1;
}
