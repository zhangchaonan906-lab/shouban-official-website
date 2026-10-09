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

  it("creates a human-approved rollback plan for an immutable prior image only", () => {
    const plan = createRollbackPlan({
      previousImage: "registry.invalid/site@sha256:" + "a".repeat(64),
      composeFile: "/opt/site/compose.website.yml",
      composeEnvFile: "/etc/site/compose.env"
    });

    expect(plan.ok).toBe(true);
    if (!plan.ok) throw new Error("valid immutable rollback plan rejected");
    expect(plan.requiresHumanApproval).toBe(true);
    expect(plan.composeArgs).toContain("--no-deps");
    expect(plan.composeArgs).toContain("website");
    expect(plan.composeArgs).not.toContain("down");

    expect(
      createRollbackPlan({
        previousImage: "registry.invalid/site:latest",
        composeFile: "compose.website.yml",
        composeEnvFile: "compose.env"
      })
    ).toEqual({
      ok: false,
      code: "ROLLBACK_IMAGE_REFERENCE_NOT_IMMUTABLE"
    });
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

    expect(runbook).toContain("前一不可变镜像 digest");
    expect(runbook).toContain("不执行 docker compose down");
    expect(runbook).toContain("回滚");
    expect(runbook).toContain("业务负责人");
  });
});
