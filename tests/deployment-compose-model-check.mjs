import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { validateDeploymentModel } from "../scripts/deployment/deployment-checks.mjs";
import { verifyRollbackComposeModel } from "../scripts/deployment/rollback-plan.mjs";

// Exercise the validators against real Compose serialization, not a hand-made
// production-ready fixture. The CI runtime is intentionally incomplete.
try {
  const fixture = parseEnv(readFileSync("deploy/ci.compose.env", "utf8"));
  const config = {
    image: fixture.SHOUBAN_IMAGE,
    gatewayImage: fixture.SHOUBAN_GATEWAY_IMAGE,
    gatewayConfig: resolve("deploy/caddy/shouban-alb-http.caddy"),
    bindIp: fixture.SHOUBAN_BIND_IP,
    port: fixture.SHOUBAN_GATEWAY_PORT,
    domain: fixture.SHOUBAN_SITE_DOMAIN,
    origin: "https://deployment-validation.invalid",
    network: fixture.SHOUBAN_PROXY_NETWORK,
    proxyCidrs: [fixture.SHOUBAN_TRUSTED_PROXY_CIDRS]
  };
  for (const maintenance of [false, true]) {
    const args = ["compose", "--project-name", "shouban-prod", "--env-file", "deploy/ci.compose.env"];
    if (!maintenance) args.push("-f", "deploy/compose.website.yml");
    args.push("-f", "deploy/compose.gateway.yml", "config", "--format", "json");
    const result = spawnSync("docker", args, { encoding: "utf8", timeout: 20000 });
    if (result.status !== 0) throw new Error();
    const model = JSON.parse(result.stdout);
    if (!maintenance) validateDeploymentModel(model, config);
    const plan = {
      services: maintenance ? ["gateway"] : ["website", "gateway"],
      descriptor: {
        websiteImage: config.image, gatewayImage: config.gatewayImage,
        siteOrigin: config.origin, siteDomain: config.domain,
        proxyNetwork: config.network, privateBindIp: config.bindIp,
        gatewayPort: Number(config.port), trustedProxyCidrs: config.proxyCidrs,
        files: { gatewayConfig: { path: config.gatewayConfig } }
      }
    };
    if (!verifyRollbackComposeModel(plan, model)) throw new Error();
  }
  process.stdout.write("CI_REAL_COMPOSE_TOOL_VALIDATORS_OK\n");
} catch {
  process.stderr.write("CI_REAL_COMPOSE_TOOL_VALIDATORS_FAILED\n");
  process.exitCode = 1;
}
