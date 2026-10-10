import { readFileSync } from "node:fs";
import {
  compareSiteDomainToOrigin,
  compareSiteOrigins,
  isReservedSiteOrigin
} from "./site-origin.mjs";

const builtOriginPath = "/app/.next/standalone-site-origin.txt";

try {
  const builtOrigin = readFileSync(builtOriginPath, "utf8").trim();
  const runtimeOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  const result = compareSiteOrigins(runtimeOrigin, builtOrigin);

  if (!result.ok) {
    process.stderr.write(result.code + "\n");
    process.exit(1);
  }

  const domainResult = compareSiteDomainToOrigin(
    process.env.SHOUBAN_SITE_DOMAIN,
    runtimeOrigin
  );
  if (!domainResult.ok) {
    process.stderr.write(domainResult.code + "\n");
    process.exit(1);
  }

  if (isReservedSiteOrigin(runtimeOrigin)) {
    process.stderr.write("DEPLOYMENT_SITE_ORIGIN_PLACEHOLDER\n");
    process.exit(1);
  }
} catch {
  process.stderr.write("DEPLOYMENT_SITE_ORIGIN_CHECK_INTERNAL_ERROR\n");
  process.exit(1);
}