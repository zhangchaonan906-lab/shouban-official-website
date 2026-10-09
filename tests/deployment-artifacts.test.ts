import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runGatedStart } from "../scripts/deployment/start-standalone.mjs";
import { isHealthy } from "../scripts/deployment/healthcheck.mjs";
import {
  compareSiteDomainToOrigin,
  compareSiteOrigins,
  isReservedSiteOrigin
} from "../scripts/deployment/site-origin.mjs";
import { createRollbackPlan } from "../scripts/deployment/rollback-plan.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Aliyun standalone deployment invariants", () => {
  it("keeps the privacy no-store surfaces while enabling standalone output", () => {
    const config = read("next.config.ts");

    expect(config).toContain('output: "standalone"');
    expect(config).toContain('source: "/contact"');
    expect(config).toContain('source: "/privacy"');
    expect(config).toContain('source: "/api/contact"');
    expect(config).toContain("private, no-store, max-age=0");
  });

  it("does not launch the server when release:check fails", () => {
    const order: string[] = [];
    const result = runGatedStart({
      runReleaseCheck: () => {
        order.push("release-check");
        return 1;
      },
      checkSiteOrigin: () => {
        order.push("origin-check");
        return 0;
      },
      startServer: () => {
        order.push("server");
        return "test-only";
      }
    });

    expect(result).toEqual({ started: false, exitCode: 1 });
    expect(order).toEqual(["release-check"]);
  });

  it("does not launch the server when the build origin differs from runtime", () => {
    const order: string[] = [];
    const result = runGatedStart({
      runReleaseCheck: () => {
        order.push("release-check");
        return 0;
      },
      checkSiteOrigin: () => {
        order.push("origin-check");
        return 1;
      },
      startServer: () => {
        order.push("server");
        return "test-only";
      }
    });

    expect(result).toEqual({ started: false, exitCode: 1 });
    expect(order).toEqual(["release-check", "origin-check"]);
  });

  it("starts only after both checks succeed (control-flow unit test, no compliance fixture)", () => {
    const order: string[] = [];
    const result = runGatedStart({
      runReleaseCheck: () => {
        order.push("release-check");
        return 0;
      },
      checkSiteOrigin: () => {
        order.push("origin-check");
        return 0;
      },
      startServer: () => {
        order.push("server");
        return "test-only";
      }
    });

    expect(result.started).toBe(true);
    if (!result.started) throw new Error("gated start did not start");
    expect(result.startResult).toBe("test-only");
    expect(order).toEqual(["release-check", "origin-check", "server"]);
  });

  it("rejects mismatched or non-HTTPS build/runtime origins without echoing values", () => {
    expect(
      compareSiteOrigins(
        "https://preview.invalid",
        "https://different.invalid"
      )
    ).toEqual({ ok: false, code: "DEPLOYMENT_SITE_ORIGIN_MISMATCH" });
    expect(
      compareSiteOrigins("http://preview.invalid", "http://preview.invalid")
    ).toEqual({ ok: false, code: "DEPLOYMENT_SITE_ORIGIN_INVALID" });
  });

  it("requires the Caddy hostname to match the build and runtime origin", () => {
    expect(
      compareSiteDomainToOrigin(
        "preview.invalid",
        "https://preview.invalid"
      )
    ).toEqual({ ok: true });
    expect(
      compareSiteDomainToOrigin(
        "other.invalid",
        "https://preview.invalid"
      )
    ).toEqual({ ok: false, code: "DEPLOYMENT_CADDY_DOMAIN_MISMATCH" });
  });

  it("identifies reserved placeholders as unsuitable for production", () => {
    expect(isReservedSiteOrigin("https://preview.invalid")).toBe(true);
    expect(isReservedSiteOrigin("https://localhost")).toBe(true);
  });

  it("tests health probe success and failure without starting the production app", async () => {
    const healthyFetch = async () => ({ status: 200 }) as Response;
    const failedFetch = async () => ({ status: 503 }) as Response;
    const throwingFetch = async () => {
      throw new Error("network unavailable");
    };

    await expect(isHealthy(healthyFetch)).resolves.toBe(true);
    await expect(isHealthy(failedFetch)).resolves.toBe(false);
    await expect(isHealthy(throwingFetch)).resolves.toBe(false);
  });

  it("binds a prior digest image to its exact versioned runtime config", () => {
    const previousRelease = {
      image: "registry.invalid/site@sha256:" + "a".repeat(64),
      runtimeEnvFile: "/etc/shouban/releases/v17/runtime.env",
      runtimeEnvSha256: "b".repeat(64)
    };
    const plan = createRollbackPlan({
      previousRelease,
      composeFile: "/opt/site/compose.website.yml",
      proxyNetwork: "shouban-proxy"
    });

    expect(plan.ok).toBe(true);
    if (!plan.ok) throw new Error("valid previous release rejected");
    expect(plan.requiresHumanApproval).toBe(true);
    expect(plan.selectedRelease).toEqual(previousRelease);
    expect(plan.environment).toEqual({
      SHOUBAN_IMAGE: previousRelease.image,
      SHOUBAN_RUNTIME_ENV_FILE: previousRelease.runtimeEnvFile,
      SHOUBAN_PROXY_NETWORK: "shouban-proxy"
    });
    expect(plan.runtimeConfigVerification).toEqual({
      path: previousRelease.runtimeEnvFile,
      sha256: previousRelease.runtimeEnvSha256
    });
    expect(plan.composeArgs).toContain("--no-deps");
    expect(plan.composeArgs).toContain("website");
    expect(plan.composeArgs).not.toContain("down");
    expect(plan.composeArgs).not.toContain("--env-file");
  });

  it("rejects mutable SHA-looking tags and digest references", () => {
    for (const image of [
      "registry.invalid/site:latest",
      "registry.invalid/site:" + "a".repeat(40),
      "registry.invalid/site@sha256:1234"
    ]) {
      expect(
        createRollbackPlan({
          previousRelease: {
            image,
            runtimeEnvFile: "/etc/shouban/releases/v17/runtime.env",
            runtimeEnvSha256: "b".repeat(64)
          },
          composeFile: "/opt/site/compose.website.yml",
          proxyNetwork: "shouban-proxy"
        })
      ).toEqual({ ok: false, code: "ROLLBACK_IMAGE_REFERENCE_NOT_DIGEST" });
    }
  });

  it("rejects malformed image, runtime config, and Compose inputs", () => {
    const validRelease = {
      image: "registry.invalid/site@sha256:" + "a".repeat(64),
      runtimeEnvFile: "/etc/shouban/releases/v17/runtime.env",
      runtimeEnvSha256: "b".repeat(64)
    };

    expect(
      createRollbackPlan({
        previousRelease: { ...validRelease, image: "bad image@sha256:" + "a".repeat(64) },
        composeFile: "/opt/site/compose.website.yml",
        proxyNetwork: "shouban-proxy"
      })
    ).toEqual({ ok: false, code: "ROLLBACK_IMAGE_REFERENCE_INVALID" });

    expect(
      createRollbackPlan({
        previousRelease: { ...validRelease, image: "registry.invalid/Site@sha256:" + "a".repeat(64) },
        composeFile: "/opt/site/compose.website.yml",
        proxyNetwork: "shouban-proxy"
      })
    ).toEqual({ ok: false, code: "ROLLBACK_IMAGE_REFERENCE_INVALID" });

    expect(
      createRollbackPlan({
        previousRelease: { ...validRelease, runtimeEnvFile: "runtime.env" },
        composeFile: "/opt/site/compose.website.yml",
        proxyNetwork: "shouban-proxy"
      })
    ).toEqual({ ok: false, code: "ROLLBACK_RUNTIME_CONFIG_INVALID" });

    expect(
      createRollbackPlan({
        previousRelease: {
          ...validRelease,
          runtimeEnvFile: "/etc/shouban/releases/current/runtime.env"
        },
        composeFile: "/opt/site/compose.website.yml",
        proxyNetwork: "shouban-proxy"
      })
    ).toEqual({ ok: false, code: "ROLLBACK_RUNTIME_CONFIG_INVALID" });

    expect(
      createRollbackPlan({
        previousRelease: { ...validRelease, runtimeEnvSha256: "bad" },
        composeFile: "/opt/site/compose.website.yml",
        proxyNetwork: "shouban-proxy"
      })
    ).toEqual({ ok: false, code: "ROLLBACK_RUNTIME_CONFIG_INVALID" });

    expect(
      createRollbackPlan({
        previousRelease: validRelease,
        composeFile: "compose.website.yml",
        proxyNetwork: "shouban-proxy"
      })
    ).toEqual({ ok: false, code: "ROLLBACK_COMPOSE_INPUT_INVALID" });

    expect(createRollbackPlan(null as never)).toEqual({
      ok: false,
      code: "ROLLBACK_PREVIOUS_RELEASE_MISSING"
    });

    expect(
      createRollbackPlan({
        previousRelease: validRelease,
        composeFile: "/opt/site/compose.website.yml",
        proxyNetwork: "bad network name"
      })
    ).toEqual({ ok: false, code: "ROLLBACK_COMPOSE_INPUT_INVALID" });
  });

  it("uses a rootless Node 24 multistage image and a separate production Compose service", () => {
    const dockerfile = read("deploy/Dockerfile");
    const compose = read("deploy/compose.website.yml");
    const entrypoint = read("scripts/deployment/start-standalone.mjs");

    expect(dockerfile).toMatch(/FROM node:24-bookworm-slim AS deps/);
    expect(dockerfile).toMatch(/FROM node:24-bookworm-slim AS builder/);
    expect(dockerfile).toMatch(/FROM node:24-bookworm-slim AS runner/);
    expect(dockerfile).toContain("USER node:node");
    expect(dockerfile).toContain("ENTRYPOINT");
    expect(dockerfile).not.toMatch(/SMTP_(?:HOST|USER|PASS)/);
    expect(compose).not.toMatch(/^\s*ports\s*:/m);
    expect(compose).toContain("cpus:");
    expect(compose).toContain("mem_limit:");
    expect(compose).toContain("memswap_limit:");
    expect(compose).toContain("pids_limit:");
    expect(compose).toContain("read_only: true");
    expect(compose).toContain("healthcheck:");
    expect(compose).toContain("max-size:");
    expect(compose).toContain("external: true");
    expect(compose).not.toContain("build:");
    expect(entrypoint).toContain("runGatedStart");
    expect(entrypoint.indexOf('["run", "release:check"]')).toBeGreaterThanOrEqual(0);
    expect(entrypoint).toContain('["server.js"]');
  });

  it("keeps the Caddy site template isolated and preserves caching and body-size guards", () => {
    const site = read("deploy/caddy/shouban-site.caddy");
    const importHint = read("deploy/caddy/import-sites-enabled.fragment");

    expect(site).toContain("{$SHOUBAN_SITE_DOMAIN}");
    expect(site).toContain("shouban-website:3000");
    expect(site).toContain("max_size 16384");
    expect(site).toContain("/contact");
    expect(site).toContain("/privacy");
    expect(site).toContain("/api/contact");
    expect(site).toContain("request>headers delete");
    expect(site).toContain("request>uri delete");
    expect(site).toContain("request>body delete");
    expect(importHint).toContain("import /etc/caddy/sites-enabled/*.caddy");
  });

  it("tests Docker DNS proxying and log redaction only in an isolated CI component", () => {
    const workflow = read(".github/workflows/quality.yml");
    const componentTest = read("scripts/deployment/ci-network-test.sh");
    const probe = read("tests/deployment-proxy-probe.mjs");
    const logCheck = read("tests/deployment-caddy-log-check.py");
    const productionImage = read("deploy/Dockerfile");

    expect(workflow).toContain("Verify isolated Docker DNS proxy and Caddy log redaction");
    expect(workflow).toContain("scripts/deployment/ci-network-test.sh");
    expect(workflow).toContain("caddy:2.10.2 fmt --diff");
    expect(workflow).toContain("caddy:2.10.2 adapt");
    expect(componentTest).toContain("CI-only component smoke test");
    expect(componentTest).toContain("docker network create --internal");
    expect(componentTest).toContain("--entrypoint node");
    expect(componentTest).toContain("caddy:2.10.2");
    expect(componentTest).toContain("tests/deployment-caddy-log-check.py");
    expect(probe).toContain("SYNTHETIC_COOKIE");
    expect(probe).toContain("SYNTHETIC_QUERY");
    expect(logCheck).toContain("remote_ip");
    expect(logCheck).toContain("client_ip");
    expect(productionImage).toContain(
      'ENTRYPOINT ["node", "/app/scripts/deployment/start-standalone.mjs"]'
    );
  });

  it("keeps host preflight and acceptance checks read-only", () => {
    const preflight = read("scripts/deployment/preflight.sh");
    const acceptance = read("scripts/deployment/acceptance.sh");

    for (const script of [preflight, acceptance]) {
      expect(script).not.toMatch(/docker\s+(?:network\s+create|restart|rm|system\s+prune)/);
      expect(script).not.toMatch(/docker\s+compose\s+(?:up|down)/);
      expect(script).not.toMatch(/caddy\s+reload/);
      expect(script).not.toMatch(/(?:iptables|ufw)\s/);
    }

    expect(acceptance).not.toMatch(/(?:--request| -X )\s*POST/);
    expect(acceptance).not.toMatch(/--data(?:-binary)?/);
    expect(preflight).toContain("PREFLIGHT_ASSISTANT_ON_WEBSITE_NETWORK");
  });

  it("documents an immutable image rollback without destructive project cleanup", () => {
    const runbook = read("docs/deployment/alibaba-cloud-shared-ecs.md");

    expect(runbook).toContain("registry/repository@sha256:<64位摘要>");
    expect(runbook).toContain("SHOUBAN_RUNTIME_ENV_FILE");
    expect(runbook).toContain("文件 SHA-256");
    expect(runbook).toContain("不执行 `docker compose down`");
    expect(runbook).toContain("回滚");
    expect(runbook).toContain("业务负责人");
  });
});
