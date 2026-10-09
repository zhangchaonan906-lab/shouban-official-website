type SiteOriginResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "DEPLOYMENT_SITE_ORIGIN_INVALID"
        | "DEPLOYMENT_SITE_ORIGIN_MISMATCH"
        | "DEPLOYMENT_CADDY_DOMAIN_INVALID"
        | "DEPLOYMENT_CADDY_DOMAIN_MISMATCH";
    };

export function isExactHttpsOrigin(value: unknown): boolean;
export function compareSiteOrigins(
  runtimeOrigin: unknown,
  builtOrigin: unknown
): SiteOriginResult;
export function compareSiteDomainToOrigin(
  siteDomain: unknown,
  siteOrigin: unknown
): SiteOriginResult;
export function isReservedSiteOrigin(value: unknown): boolean;
