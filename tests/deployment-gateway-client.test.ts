import { createServer, type RequestListener, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { requestGateway } from "./deployment-gateway-probe.mjs";

const servers: Server[] = [];
async function listen(handler: RequestListener) {
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("loopback bind failed");
  return { target: "127.0.0.1", port: address.port };
}
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((done) => {
    server.closeAllConnections();
    server.close(() => done());
  })));
});

describe("isolated gateway HTTP probe client", () => {
  it("sends the exact canonical Host and retains wrong-Host negative behavior", async () => {
    const seen: string[] = [];
    const connection = await listen((request, response) => {
      seen.push(request.headers.host ?? "");
      response.writeHead(request.headers.host === "deployment-validation.invalid" ? 200 : 403, { "Cache-Control": "private, no-store" });
      response.end("{}");
    });
    const good = await requestGateway("/", { headers: { Host: "deployment-validation.invalid" } }, connection);
    const bad = await requestGateway("/", { headers: { Host: "wrong.invalid" } }, connection);
    expect(good.status).toBe(200);
    expect(good.headers.get("cache-control")).toBe("private, no-store");
    expect(bad.status).toBe(403);
    expect(seen).toEqual(["deployment-validation.invalid", "wrong.invalid"]);
  });

  it("sends synthetic POST bytes with an explicit Host", async () => {
    let observed = "";
    const connection = await listen(async (request, response) => {
      for await (const chunk of request) observed += chunk.toString();
      response.end(JSON.stringify({ method: request.method, host: request.headers.host }));
    });
    const response = await requestGateway("/api/contact", { method: "POST", headers: { Host: "deployment-validation.invalid" }, body: "synthetic bytes" }, connection);
    expect(await response.json()).toEqual({ method: "POST", host: "deployment-validation.invalid" });
    expect(observed).toBe("synthetic bytes");
  });

  it("refuses redirects without following an external destination", async () => {
    let hits = 0;
    const connection = await listen((_request, response) => {
      hits += 1;
      response.writeHead(302, { Location: "https://untrusted.invalid/" }).end();
    });
    await expect(requestGateway("/", {}, connection)).rejects.toThrow("CI_GATEWAY_REDIRECT_FORBIDDEN");
    expect(hits).toBe(1);
  });

  it("caps a chunked response at 32 KiB and destroys the connection", async () => {
    const connection = await listen((_request, response) => {
      response.write(Buffer.alloc(32769, 120));
    });
    await expect(requestGateway("/", {}, connection)).rejects.toThrow("CI_GATEWAY_RESPONSE_TOO_LARGE");
  });

  it("refuses a declared oversized response before reading its body", async () => {
    const connection = await listen((_request, response) => {
      response.writeHead(200, { "Content-Length": "32769" });
      response.flushHeaders();
    });
    await expect(requestGateway("/", {}, connection)).rejects.toThrow("CI_GATEWAY_RESPONSE_TOO_LARGE");
  });

  it("uses a total deadline even while response data remains continuously active", async () => {
    const connection = await listen((_request, response) => {
      response.write("x");
      const timer = setInterval(() => response.write("x"), 5);
      response.on("close", () => clearInterval(timer));
    });
    const start = performance.now();
    await expect(requestGateway("/", {}, { ...connection, timeoutMs: 75 })).rejects.toThrow("CI_GATEWAY_REQUEST_DEADLINE");
    expect(performance.now() - start).toBeLessThan(1000);
  });

  it("refuses external/protocol targets and excessive bounds without connecting", async () => {
    for (const connection of [
      { target: "sbrz.com.cn" }, { target: "https://127.0.0.1" },
      { target: "127.0.0.1", timeoutMs: 5001 }, { target: "127.0.0.1", maxResponseBytes: 32769 }
    ]) await expect(requestGateway("/", {}, connection)).rejects.toThrow("CI_GATEWAY_REQUEST_INPUT_INVALID");
    await expect(requestGateway("https://untrusted.invalid/", {}, { target: "127.0.0.1" })).rejects.toThrow("CI_GATEWAY_REQUEST_INPUT_INVALID");
  });
});
