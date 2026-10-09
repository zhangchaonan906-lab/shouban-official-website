import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const entrypointPath = fileURLToPath(
  new URL("../scripts/container-entrypoint.mjs", import.meta.url)
);

describe("container entrypoint", () => {
  it("refuses to start the standalone server before privacy release readiness", () => {
    const environment = {} as NodeJS.ProcessEnv;

    for (const key of ["PATH", "SYSTEMROOT", "WINDIR", "TEMP", "TMP"]) {
      const value = process.env[key];
      if (value !== undefined) {
        environment[key] = value;
      }
    }

    const result = spawnSync(process.execPath, [entrypointPath], {
      cwd: projectRoot,
      encoding: "utf8",
      env: environment
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "PRIVACY_CONFIG_MISSING NEXT_PUBLIC_SITE_URL"
    );
    expect(result.stderr).not.toContain("MODULE_NOT_FOUND");
  });
});
