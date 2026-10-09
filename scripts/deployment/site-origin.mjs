const RESERVED_SUFFIXES = Object.freeze([
  ".invalid",
  ".example",
  ".test",
  ".localhost",
  ".local"
]);

const RESERVED_HOSTS = new Set([
  "localhost",
  "example.com",
  "example.net",
  "example.org"
]);

export function isExactHttpsOrigin(value) {
  if (typeof value !== "string" || value.trim() !== value || value === "") {
    return false;
  }

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      value === url.origin
    );
  } catch {
    return false;
  }
}

export function compareSiteOrigins(runtimeOrigin, builtOrigin) {
  if (
    !isExactHttpsOrigin(runtimeOrigin) ||
    !isExactHttpsOrigin(builtOrigin)
  ) {
    return { ok: false, code: "DEPLOYMENT_SITE_ORIGIN_INVALID" };
  }

  if (runtimeOrigin !== builtOrigin) {
    return { ok: false, code: "DEPLOYMENT_SITE_ORIGIN_MISMATCH" };
  }

  return { ok: true };
}

export function compareSiteDomainToOrigin(siteDomain, siteOrigin) {
  if (
    typeof siteDomain !== "string" ||
    siteDomain.trim() !== siteDomain ||
    siteDomain === "" ||
    !isExactHttpsOrigin(siteOrigin)
  ) {
    return { ok: false, code: "DEPLOYMENT_CADDY_DOMAIN_INVALID" };
  }

  if (siteDomain.toLowerCase() !== new URL(siteOrigin).host.toLowerCase()) {
    return { ok: false, code: "DEPLOYMENT_CADDY_DOMAIN_MISMATCH" };
  }

  return { ok: true };
}

export function isReservedSiteOrigin(value) {
  if (!isExactHttpsOrigin(value)) {
    return true;
  }

  const hostname = new URL(value).hostname.toLowerCase();
  return (
    RESERVED_HOSTS.has(hostname) ||
    RESERVED_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  );
}