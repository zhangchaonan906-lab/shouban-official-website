import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

describe("deployment templates", () => {
  it("keeps the contact proxy limit and site address isolated", () => {
    const caddy = read("deploy/caddy/shouban-site.Caddyfile.example");

    expect(caddy).toContain("shouban.example.invalid");
    expect(caddy).toContain("max_size 16KB");
    expect(caddy).toContain("reverse_proxy 127.0.0.1:3100");
  });

  it("keeps the app on loopback and configures its liveness check", () => {
    const compose = read("compose.yaml");

    expect(compose).toContain(
      '127.0.0.1:${SHOUBAN_APP_PORT:-3100}:3000'
    );
    expect(compose).toContain("http://127.0.0.1:3000/api/health");
    expect(compose).not.toContain("  caddy:");
  });

  it("packages the standalone app as non-root with the release gate", () => {
    const dockerfile = read("Dockerfile");

    expect(dockerfile).toContain('ENTRYPOINT ["node", "./scripts/container-entrypoint.mjs"]');
    expect(dockerfile).toContain("privacy-release-check.mjs");
    expect(dockerfile).toContain("USER nextjs");
  });
});
