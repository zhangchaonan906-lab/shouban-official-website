import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import robots from "../app/robots";
import sitemap from "../app/sitemap";
import nextConfig from "../next.config";
import { canonicalUrl } from "../lib/seo";

const noStoreHeader = {
  key: "Cache-Control",
  value: "private, no-store, max-age=0"
};

describe("privacy metadata routes", () => {
  it("keeps privacy in the static sitemap without coupling it to runtime readiness", () => {
    const privacyEntries = sitemap().filter(
      (entry) => entry.url === canonicalUrl("/privacy")
    );
    const source = readFileSync(
      join(process.cwd(), "app", "sitemap.ts"),
      "utf8"
    );

    expect(privacyEntries).toHaveLength(1);
    expect(source).not.toMatch(/privacy-readiness|getContactCollectionReadiness/);
    expect(source).not.toMatch(/export const dynamic|process\.env/);
  });

  it("keeps public crawling and the canonical sitemap declaration stable", () => {
    expect(robots()).toEqual({
      rules: {
        userAgent: "*",
        allow: "/"
      },
      sitemap: canonicalUrl("/sitemap.xml")
    });
  });

  it("marks contact, privacy and the contact API as private no-store surfaces", async () => {
    expect(nextConfig.headers).toBeTypeOf("function");
    const headers = await nextConfig.headers?.();

    expect(headers).toEqual([
      { source: "/contact", headers: [noStoreHeader] },
      { source: "/privacy", headers: [noStoreHeader] },
      { source: "/api/contact", headers: [noStoreHeader] }
    ]);
  });

  it("uses the standalone deployment output mode", () => {
    const source = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

    expect(nextConfig.output).toBe("standalone");
    expect(source).toMatch(/\boutput:\s*"standalone"/);
  });
});
