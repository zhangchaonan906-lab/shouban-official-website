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
    const args = ["--project-name", "shouban-prod", "--env-file", "deploy/ci.compose.env"];
    const binary = process.env.CI_COMPOSE_TEST_BINARY ?? "docker";
    if (!process.env.CI_COMPOSE_TEST_BINARY) args.unshift("compose");
    if (!maintenance) args.push("-f", "deploy/compose.website.yml");
    args.push("-f", "deploy/compose.gateway.yml", "config", "--format", "json");
    const result = spawnSync(binary, args, { encoding: "utf8", timeout: 20000 });
    if (result.status !== 0) throw new Error("CI_COMPOSE_RENDER_FAILED");
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
    if (!verifyRollbackComposeModel(plan, model)) {
      // Boolean-only diagnostics. Never print the resolved model or its env.
      const gateway = model.services.gateway;
      process.stderr.write(JSON.stringify({
        maintenance,
        bindSourceMatches: gateway.volumes?.[0]?.source === config.gatewayConfig,
        createHostPathPresent: Object.hasOwn(gateway.volumes?.[0]?.bind ?? {}, "create_host_path"),
        createHostPathFalse: gateway.volumes?.[0]?.bind?.create_host_path === false,
        tmpfsIsArray: Array.isArray(gateway.tmpfs),
        healthMatches: JSON.stringify(gateway.healthcheck?.test) === JSON.stringify(["CMD", "wget", "-q", "-T", "3", "-O", "/dev/null", "http://127.0.0.1:8080/healthz"])
      }) + "\n");
      throw new Error(maintenance ? "CI_COMPOSE_MAINTENANCE_MODEL_REJECTED" : "CI_COMPOSE_WEBSITE_MODEL_REJECTED");
    }
  }
  process.stdout.write("CI_REAL_COMPOSE_TOOL_VALIDATORS_OK\n");
} catch (error) {
  const code = error?.code ?? error?.message;
  process.stderr.write((typeof code === "string" && /^(?:PREFLIGHT|CI_COMPOSE)_[A-Z_]+$/.test(code)
    ? code : "CI_REAL_COMPOSE_TOOL_VALIDATORS_FAILED") + "\n");
  process.exitCode = 1;
}
