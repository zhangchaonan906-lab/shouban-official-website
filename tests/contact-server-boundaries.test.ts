import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const serverOnlyModules = [
  "app/api/contact/route.ts",
  "lib/contact-request.server.ts",
  "lib/mail.ts",
  "lib/privacy-readiness.server.ts"
] as const;

describe("contact server-only module boundaries", () => {
  it.each(serverOnlyModules)("marks %s as server-only", (relativePath) => {
    const source = readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

    expect(source.startsWith('import "server-only";')).toBe(true);
  });
});
