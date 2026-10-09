import { writeFileSync } from "node:fs";
import { isExactHttpsOrigin } from "./site-origin.mjs";

const [siteOrigin, outputPath] = process.argv.slice(2);

if (!isExactHttpsOrigin(siteOrigin) || typeof outputPath !== "string") {
  process.stderr.write("DEPLOYMENT_BUILD_SITE_ORIGIN_INVALID\n");
  process.exit(1);
}

try {
  writeFileSync(outputPath, siteOrigin + "\n", { mode: 0o444 });
} catch {
  process.stderr.write("DEPLOYMENT_BUILD_SITE_ORIGIN_WRITE_FAILED\n");
  process.exit(1);
}