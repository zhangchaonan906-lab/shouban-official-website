const caddyOrigin = "http://shouban-ci-limit-caddy:8081";

async function getHitCount() {
  const response = await fetch(`${caddyOrigin}/__hits`, {
    signal: AbortSignal.timeout(3000)
  });
  if (!response.ok) throw new Error("CI_LIMIT_UPSTREAM_PROBE_FAILED");
  const payload = await response.json();
  if (!Number.isInteger(payload.hits)) {
    throw new Error("CI_LIMIT_UPSTREAM_COUNTER_INVALID");
  }
  return payload.hits;
}

let hitsBefore;
for (let attempt = 0; attempt < 30; attempt += 1) {
  try {
    hitsBefore = await getHitCount();
    break;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
if (hitsBefore === undefined) {
  throw new Error("CI_LIMIT_PROXY_NOT_READY");
}

const oversizedBody = Buffer.concat([
  Buffer.from("CI_OVERSIZED_BODY_SENTINEL"),
  Buffer.alloc(17_000, 120)
]);
const oversizedResponse = await fetch(`${caddyOrigin}/api/contact`, {
  method: "POST",
  headers: { "Content-Type": "application/octet-stream" },
  body: oversizedBody,
  signal: AbortSignal.timeout(5000)
});
if (oversizedResponse.status !== 413) {
  throw new Error("CI_CADDY_REQUEST_LIMIT_STATUS_INVALID");
}

const hitsAfter = await getHitCount();
if (hitsAfter !== hitsBefore) {
  throw new Error("CI_CADDY_REQUEST_LIMIT_REACHED_UPSTREAM");
}

process.stdout.write("CI_CADDY_REQUEST_LIMIT_OK status=413 upstream=unchanged\n");
