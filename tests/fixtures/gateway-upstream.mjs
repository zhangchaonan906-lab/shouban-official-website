import { createServer } from "node:http";

let hits = 0;
createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  if (request.url === "/__hits") {
    response.end(JSON.stringify({ hits }));
    return;
  }
  if (request.url === "/healthz") {
    response.writeHead(404).end("{}");
    return;
  }
  // This synthetic upstream has no SMTP adapter or production data.
  try {
    for await (const _chunk of request) { /* consume synthetic bodies */ }
  } catch {
    return;
  }
  hits += 1;
  response.end(JSON.stringify({
    proto: request.headers["x-forwarded-proto"],
    host: request.headers.host
  }));
}).listen(3000, "0.0.0.0");
