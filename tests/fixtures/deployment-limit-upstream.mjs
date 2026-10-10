import { createServer } from "node:http";

let hits = 0;

createServer(async (request, response) => {
  if (request.url === "/__hits") {
    response.writeHead(200, {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": "application/json"
    });
    response.end(JSON.stringify({ hits }));
    return;
  }

  try {
    for await (const _chunk of request) {
      // Consume the body so a successfully proxied request is counted only
      // after it has reached this disposable upstream.
    }
  } catch (error) {
    if (error?.code === "ECONNRESET") return;
    throw error;
  }

  hits += 1;
  response.writeHead(200, {
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Type": "application/json"
  });
  response.end(JSON.stringify({ hits }));
}).listen(3000, "0.0.0.0");
