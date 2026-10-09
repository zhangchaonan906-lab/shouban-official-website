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
    expect(caddy).toContain("reverse_proxy shouban-web:3000");
    expect(caddy).not.toMatch(/^\s*log\s*\{/m);
  });

  it("uses a dedicated external proxy network without publishing a host port", () => {
    const compose = read("compose.yaml");

    expect(compose).toContain("SHOUBAN_PROXY_NETWORK");
    expect(compose).toContain("external: true");
    expect(compose).toContain("shouban-web");
    expect(compose).not.toMatch(/^\s*ports\s*:/m);
    expect(compose).toContain("http://127.0.0.1:3000/api/health");
    expect(compose).not.toContain("  caddy:");
  });

  it("sets bounded CPU, memory, process and rotating log limits", () => {
    const compose = read("compose.yaml");

    expect(compose).toMatch(/^\s*cpus:\s*["']?1(?:\.0)?["']?\s*$/m);
    expect(compose).toMatch(/^\s*mem_limit:\s*1536m\s*$/m);
    expect(compose).toMatch(/^\s*pids_limit:\s*256\s*$/m);
    expect(compose).toContain("max-size: \"10m\"");
    expect(compose).toContain("max-file: \"3\"");
  });

  it("packages the standalone app as non-root with the release gate", () => {
    const dockerfile = read("Dockerfile");

    expect(dockerfile).toContain('ENTRYPOINT ["node", "./scripts/container-entrypoint.mjs"]');
    expect(dockerfile).toContain("privacy-release-check.mjs");
    expect(dockerfile).toContain("USER nextjs");
    expect(dockerfile).toMatch(/FROM node:24-bookworm-slim@sha256:[a-f0-9]{64}/);
    expect(dockerfile).toContain(".build-site-origin");
  });

  it("excludes local credential files from the Docker build context", () => {
    const dockerignore = read(".dockerignore");
    const verifier = read("scripts/verify-container-caddy.sh");

    for (const pattern of [".env*", "*.pem", "*.key", "*.p12", "*.pfx"]) {
      expect(dockerignore).toContain(pattern);
    }
    expect(verifier).toContain("credential file in final image");
  });

  it("runs real image and isolated Caddy integration checks in CI", () => {
    const workflow = read(".github/workflows/quality.yml");
    const verifier = read("scripts/verify-container-caddy.sh");

    expect(workflow).toContain("verify-container-caddy.sh");
    expect(verifier).toContain("adapt --config");
    expect(verifier).toContain("validate --config");
    expect(verifier).toContain("release-check");
    expect(verifier).toContain("docker build");
    expect(verifier).toContain("sitemap.xml.body");
    expect(verifier).toContain("CONTAINER_SITE_ORIGIN_MISMATCH");
    expect(verifier).toContain('--entrypoint caddy "$CADDY_IMAGE" run --config');
    expect(verifier).toContain('trap on_error ERR');
    expect(verifier).not.toContain('echo "- Web image: `$WEB_IMAGE`"');
    expect(verifier).not.toContain('echo "- Node base digest: `$NODE_DIGEST`"');
    expect(verifier).not.toContain('echo "- Caddy test image digest: `$CADDY_DIGEST`"');
    expect(verifier).toContain('echo "- Web image: $WEB_IMAGE"');
    expect(verifier).toContain('echo "- Node base digest: $NODE_DIGEST"');
    expect(verifier).toContain('echo "- Caddy test image digest: $CADDY_DIGEST"');

    const upstream = read("tests/fixtures/proxy-upstream.mjs");
    expect(upstream).toContain('error?.code === \"ECONNRESET\"');
    expect(upstream.indexOf('for await')).toBeLessThan(upstream.indexOf('hits += 1'));
  });
});
