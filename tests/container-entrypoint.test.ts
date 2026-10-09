import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

function createContainerLayout(buildOrigin: string) {
  const root = mkdtempSync(join(tmpdir(), "shouban-entrypoint-test-"));
  const app = join(root, "app");
  const scripts = join(app, "scripts");
  const lib = join(app, "lib");

  mkdirSync(scripts, { recursive: true });
  mkdirSync(lib, { recursive: true });
  writeFileSync(join(app, ".build-site-origin"), buildOrigin);

  for (const file of ["container-entrypoint.mjs", "privacy-release-check.mjs"]) {
    cpSync(join(projectRoot, "scripts", file), join(scripts, file));
  }
  for (const file of ["privacy-readiness.mjs", "privacy-policy.mjs"]) {
    cpSync(join(projectRoot, "lib", file), join(lib, file));
  }

  return {
    root,
    entrypointPath: join(scripts, "container-entrypoint.mjs")
  };
}

function isolatedEnvironment(siteOrigin: string): NodeJS.ProcessEnv {
  const environment = {} as NodeJS.ProcessEnv;
  for (const key of ["PATH", "SYSTEMROOT", "WINDIR", "TEMP", "TMP"]) {
    const value = process.env[key];
    if (value !== undefined) environment[key] = value;
  }
  environment.NEXT_PUBLIC_SITE_URL = siteOrigin;
  return environment;
}

describe("container entrypoint", () => {
  it("rejects a runtime site origin that differs from the built origin", () => {
    const layout = createContainerLayout("https://built.example.invalid");
    try {
      const result = spawnSync(process.execPath, [layout.entrypointPath], {
        cwd: layout.root,
        encoding: "utf8",
        env: isolatedEnvironment("https://runtime.example.invalid")
      });

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("CONTAINER_SITE_ORIGIN_MISMATCH");
      expect(result.stderr).not.toContain("PRIVACY_CONFIG_MISSING");
    } finally {
      rmSync(layout.root, { recursive: true, force: true });
    }
  });

  it("runs the real release check and refuses startup when evidence is absent", () => {
    const layout = createContainerLayout("https://site.example.invalid");
    try {
      const result = spawnSync(process.execPath, [layout.entrypointPath], {
        cwd: layout.root,
        encoding: "utf8",
        env: isolatedEnvironment("https://site.example.invalid")
      });

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        "PRIVACY_CONFIG_MISSING PRIVACY_CONTACT_EMAIL"
      );
      expect(result.stderr).not.toContain("CONTAINER_SERVER_START_FAILED");
      expect(result.stderr).not.toContain("MODULE_NOT_FOUND");
    } finally {
      rmSync(layout.root, { recursive: true, force: true });
    }
  });
});
