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

  hits += 1;
  let bodyBytes = 0;
  for await (const chunk of request) bodyBytes += chunk.length;

  response.writeHead(200, {
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Type": "application/json"
  });
  response.end(
    JSON.stringify({
      hits,
      path: request.url,
      method: request.method,
      bodyBytes
    })
  );
}).listen(3000, "0.0.0.0");
