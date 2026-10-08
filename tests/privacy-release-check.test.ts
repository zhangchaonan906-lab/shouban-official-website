import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  createEvaluationTime,
  evaluatePrivacyPublicConfig
} from "../lib/privacy-readiness.mjs";
import {
  createPrivacyTestEnv,
  createReadyPrivacyEnv
} from "./privacy-fixtures";

type PrivacyEnvironment = Record<string, string | undefined>;

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const releaseCheckScript = fileURLToPath(
  new URL("../scripts/privacy-release-check.mjs", import.meta.url)
);
const printSnapshotScript = fileURLToPath(
  new URL("../scripts/privacy-print-snapshot.mjs", import.meta.url)
);

const inheritedEnvironmentAllowlist = [
  "SYSTEMROOT",
  "WINDIR",
  "PATH",
  "TEMP",
  "TMP"
] as const;

function createChildEnvironment(
  fixture: PrivacyEnvironment = {}
): NodeJS.ProcessEnv {
  const childEnvironment = {} as NodeJS.ProcessEnv;

  for (const key of inheritedEnvironmentAllowlist) {
    const value = process.env[key];
    if (value !== undefined) {
      childEnvironment[key] = value;
    }
  }

  for (const [key, value] of Object.entries(fixture)) {
    if (value !== undefined) {
      childEnvironment[key] = value;
    }
  }

  return childEnvironment;
}

function runPrivacyScript(
  scriptPath: string,
  fixture: PrivacyEnvironment = {},
  cwd = projectRoot
) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd,
    encoding: "utf8",
    env: createChildEnvironment(fixture)
  });
}

function combinedOutput(result: ReturnType<typeof runPrivacyScript>): string {
  return `${result.stdout}${result.stderr}`;
}

function expectNoConfigurationValues(
  output: string,
  environment: PrivacyEnvironment
): void {
  for (const value of new Set(Object.values(environment))) {
    if (value !== undefined && value !== "") {
      expect(output).not.toContain(value);
    }
  }
}

function runIsolatedPrivacyScript(
  scriptPath: string,
  readinessModuleSource?: string
) {
  const temporaryDirectory = mkdtempSync(
    join(tmpdir(), "privacy-cli-internal-error-")
  );
  const temporaryScriptsDirectory = join(temporaryDirectory, "scripts");
  const temporaryLibDirectory = join(temporaryDirectory, "lib");
  const temporaryScriptPath = join(
    temporaryScriptsDirectory,
    basename(scriptPath)
  );

  try {
    mkdirSync(temporaryScriptsDirectory, { recursive: true });
    mkdirSync(temporaryLibDirectory, { recursive: true });
    copyFileSync(scriptPath, temporaryScriptPath);
    if (readinessModuleSource !== undefined) {
      writeFileSync(
        join(temporaryLibDirectory, "privacy-readiness.mjs"),
        readinessModuleSource,
        "utf8"
      );
    }

    return {
      result: runPrivacyScript(temporaryScriptPath, {}, temporaryDirectory),
      temporaryDirectory
    };
  } finally {
    rmSync(temporaryDirectory, { force: true, recursive: true });
  }
}

function expectSanitizedInternalError(
  run: ReturnType<typeof runIsolatedPrivacyScript>,
  expectedError: string
): void {
  expect(run.result.error).toBeUndefined();
  expect(run.result.status).toBe(2);
  expect(run.result.stdout).toBe("");
  expect(run.result.stderr.trim()).toBe(expectedError);
  expect(run.result.stderr).not.toContain("SENTINEL_INTERNAL_SECRET");
  expect(run.result.stderr).not.toContain("Error");
  expect(run.result.stderr).not.toContain("stack");
  expect(run.result.stderr).not.toContain(run.temporaryDirectory);
}

describe("privacy release CLIs", () => {
  it("fails closed for a missing release environment without inheriting parent privacy values", () => {
    const parentOnlyValue = "SENTINEL_PARENT_ONLY_PRIVACY_VALUE";
    const originalParentValue = process.env.PRIVACY_CONTACT_EMAIL;

    process.env.PRIVACY_CONTACT_EMAIL = parentOnlyValue;
    try {
      const result = runPrivacyScript(releaseCheckScript);
      const output = combinedOutput(result);

      expect(result.error).toBeUndefined();
      expect(result.status).not.toBe(0);
      expect(output).toContain(
        "PRIVACY_CONFIG_MISSING PRIVACY_CONTACT_EMAIL"
      );
      expect(output).not.toContain(parentOnlyValue);
    } finally {
      if (originalParentValue === undefined) {
        delete process.env.PRIVACY_CONTACT_EMAIL;
      } else {
        process.env.PRIVACY_CONTACT_EMAIL = originalParentValue;
      }
    }
  });

  it("prints only the fixed success sentence for a ready release environment", () => {
    const environment = createReadyPrivacyEnv();
    const result = runPrivacyScript(releaseCheckScript, environment);
    const output = combinedOutput(result);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("privacy release check passed\n");
    expect(result.stderr).toBe("");
    expectNoConfigurationValues(output, environment);
    expect(output).not.toContain("SENTINEL_SMTP_PASSWORD");
  });

  it("prints exactly the evaluated public snapshot without runtime or SMTP configuration", () => {
    const environment = createPrivacyTestEnv();
    const expected = evaluatePrivacyPublicConfig(
      environment,
      createEvaluationTime(new Date())
    );

    expect(expected.ok).toBe(true);
    if (!expected.ok) {
      throw new Error("Expected the synthetic public privacy environment to be valid");
    }

    const expectedSnapshot = expected.publicConfig.privacyPolicySnapshotId;
    const result = runPrivacyScript(printSnapshotScript, environment);
    const output = combinedOutput(result);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(`${expectedSnapshot}\n`);
    expect(result.stdout.trim()).toMatch(/^[a-f0-9]{64}$/);
    expect(result.stderr).toBe("");
    expectNoConfigurationValues(output, environment);
  });

  it("prints only issue code and key when the public snapshot configuration is invalid", () => {
    const invalidValue = "SENTINEL_INVALID_PRIVACY_CONTACT_EMAIL";
    const environment = createPrivacyTestEnv({
      PRIVACY_CONTACT_EMAIL: invalidValue
    });
    const result = runPrivacyScript(printSnapshotScript, environment);

    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(
      "PRIVACY_CONFIG_INVALID_EMAIL PRIVACY_CONTACT_EMAIL\n"
    );
    expect(combinedOutput(result)).not.toContain(invalidValue);
  });

  it("sanitizes unexpected release-check evaluator failures", () => {
    const run = runIsolatedPrivacyScript(
      releaseCheckScript,
      `
        export function createEvaluationTime() {
          return { nowIso: "unused", beijingDate: "unused" };
        }
        export function evaluateContactCollectionReadiness() {
          throw new Error("SENTINEL_INTERNAL_SECRET");
        }
      `
    );

    expectSanitizedInternalError(
      run,
      "PRIVACY_RELEASE_CHECK_INTERNAL_ERROR INTERNAL"
    );
  });

  it("sanitizes unexpected snapshot evaluator failures", () => {
    const run = runIsolatedPrivacyScript(
      printSnapshotScript,
      `
        export function createEvaluationTime() {
          return { nowIso: "unused", beijingDate: "unused" };
        }
        export function evaluatePrivacyPublicConfig() {
          throw new Error("SENTINEL_INTERNAL_SECRET");
        }
      `
    );

    expectSanitizedInternalError(
      run,
      "PRIVACY_SNAPSHOT_INTERNAL_ERROR INTERNAL"
    );
  });

  it("sanitizes release-check module import failures", () => {
    const run = runIsolatedPrivacyScript(releaseCheckScript);

    expectSanitizedInternalError(
      run,
      "PRIVACY_RELEASE_CHECK_INTERNAL_ERROR INTERNAL"
    );
  });

  it("does not load or disclose a complete-looking .env file from the working directory", () => {
    const temporaryDirectory = mkdtempSync(
      join(tmpdir(), "privacy-release-cli-")
    );
    const dotenvSentinel = "SENTINEL_DOTENV_ONLY_SMTP_PASSWORD";
    const dotenvEnvironment = createReadyPrivacyEnv({
      SMTP_PASS: dotenvSentinel
    });
    const dotenvLines = Object.entries(dotenvEnvironment).flatMap(
      ([key, value]) => (value === undefined ? [] : [`${key}=${value}`])
    );
    dotenvLines.push(`DOTENV_ONLY_SENTINEL=${dotenvSentinel}`);

    try {
      writeFileSync(
        join(temporaryDirectory, ".env"),
        `${dotenvLines.join("\n")}\n`,
        "utf8"
      );

      const releaseResult = runPrivacyScript(
        releaseCheckScript,
        {},
        temporaryDirectory
      );
      const snapshotResult = runPrivacyScript(
        printSnapshotScript,
        {},
        temporaryDirectory
      );

      for (const result of [releaseResult, snapshotResult]) {
        expect(result.error).toBeUndefined();
        expect(result.status).not.toBe(0);
        expect(combinedOutput(result)).toContain(
          "PRIVACY_CONFIG_MISSING PRIVACY_CONTACT_EMAIL"
        );
        expect(combinedOutput(result)).not.toContain(dotenvSentinel);
      }
    } finally {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  it("does not import environment loaders or read configuration files", () => {
    for (const scriptPath of [releaseCheckScript, printSnapshotScript]) {
      const source = readFileSync(scriptPath, "utf8");

      expect(source).not.toMatch(/(?:dotenv|@next\/env)/);
      expect(source).not.toMatch(/(?:node:)?fs(?:\/promises)?/);
      expect(source).not.toMatch(
        /\b(?:loadEnvFile|loadEnvConfig|readFile|readFileSync)\s*\(/
      );
    }
  });
});
