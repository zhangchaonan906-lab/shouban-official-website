const syntheticHeaders = {
  Authorization: "Bearer SYNTHETIC_AUTH_HEADER",
  Cookie: "audit=SYNTHETIC_COOKIE_VALUE",
  "X-Forwarded-For": "203.0.113.41",
  "X-Deployment-Audit": "SYNTHETIC_REQUEST_HEADER"
};

async function request(path, init) {
  try {
    return await fetch(`http://shouban-ci-caddy:8080${path}`, {
      ...init,
      headers: { ...syntheticHeaders, ...init?.headers },
      signal: AbortSignal.timeout(5000),
      redirect: "manual"
    });
  } catch {
    process.stderr.write("CI_PROXY_DNS_REQUEST_FAILED\n");
    process.exit(1);
  }
}

const rootResponse = await request(
  "/?audit_query=SYNTHETIC_QUERY_VALUE",
  { method: "GET" }
);
if (rootResponse.status !== 200) {
  process.stderr.write("CI_PROXY_ROOT_STATUS_INVALID\n");
  process.exit(1);
}

const contactResponse = await request(
  "/api/contact?audit_query=SYNTHETIC_CONTACT_QUERY",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "SYNTHETIC_REQUEST_BODY" })
  }
);
if (contactResponse.status !== 503) {
  process.stderr.write("CI_CONTACT_COMPONENT_NOT_FAIL_CLOSED\n");
  process.exit(1);
}

process.stdout.write("CI_PROXY_DNS_HTTP_OK root=200 contact=503\n");
await new Promise((resolve) => setTimeout(resolve, 3000));
