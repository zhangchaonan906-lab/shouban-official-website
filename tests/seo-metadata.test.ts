import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { researchItems } from "@/content/research";
import { routes, siteOrigin, siteUrl } from "@/lib/constants";
import { canonicalUrl, createPageMetadata } from "@/lib/seo";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { generateMetadata as generateNewsMetadata } from "@/app/news/[slug]/page";

describe("site URL metadata", () => {
  it("keeps metadata URLs on the configured site origin", () => {
    expect(siteOrigin).toBe(new URL(siteUrl).origin);
    expect(canonicalUrl("/")).toBe(`${siteOrigin}/`);
    expect(canonicalUrl("/about")).toBe(`${siteOrigin}/about`);
  });

  it("normalizes path input and removes query strings and fragments", () => {
    expect(canonicalUrl("/news/example/?utm_source=mail#details")).toBe(
      `${siteOrigin}/news/example`
    );
    expect(canonicalUrl("//news/example?ref=home")).toBe(
      `${siteOrigin}/news/example`
    );
  });

  it("sets each page canonical and Open Graph URL without changing its copy", () => {
    const metadata = createPageMetadata(
      "原有标题",
      "原有描述",
      "/services?campaign=spring#contact"
    );
    const expectedUrl = `${siteOrigin}/services`;

    expect(metadata.title).toBe("原有标题");
    expect(metadata.description).toBe("原有描述");
    expect(metadata.alternates?.canonical).toBe(expectedUrl);
    expect(metadata.openGraph?.url).toBe(expectedUrl);
  });
});

describe("sitemap and robots routes", () => {
  it("publishes only canonical site URLs and omits unsupported modification dates", () => {
    const entries = sitemap();
    const expectedUrls = [
      ...routes,
      ...researchItems.map((item) => `/news/${item.slug}`)
    ].map(canonicalUrl);

    expect(entries.map((entry) => entry.url)).toEqual(expectedUrls);
    expect(entries.every((entry) => new URL(entry.url).origin === siteOrigin)).toBe(
      true
    );
    expect(entries.every((entry) => !("lastModified" in entry))).toBe(true);
    expect(entries.map((entry) => entry.url)).not.toContain(canonicalUrl("/cases"));
    expect(entries.map((entry) => entry.url)).not.toContain(canonicalUrl("/platform"));
  });

  it("keeps redirect aliases out of the sitemap", () => {
    const casesPage = readFileSync(join(process.cwd(), "app", "cases", "page.tsx"), "utf8");
    const platformPage = readFileSync(join(process.cwd(), "app", "platform", "page.tsx"), "utf8");
    const urls = sitemap().map((entry) => entry.url);

    expect(casesPage).toContain('redirect("/")');
    expect(platformPage).toContain('redirect("/aipr")');
    expect(urls).not.toContain(canonicalUrl("/cases"));
    expect(urls).not.toContain(canonicalUrl("/platform"));
  });

  it("points robots.txt at the configured origin's sitemap", () => {
    expect(robots()).toEqual({
      rules: {
        userAgent: "*",
        allow: "/"
      },
      sitemap: canonicalUrl("/sitemap.xml")
    });
  });
});

describe("news detail metadata", () => {
  it("uses the article slug for its canonical and Open Graph URL", async () => {
    const item = researchItems[0];
    const metadata = await generateNewsMetadata({
      params: Promise.resolve({ slug: item.slug })
    });
    const expectedUrl = canonicalUrl(`/news/${item.slug}`);

    expect(metadata.alternates?.canonical).toBe(expectedUrl);
    expect(metadata.openGraph?.url).toBe(expectedUrl);
  });

  it("does not index an unknown news slug", async () => {
    const metadata = await generateNewsMetadata({
      params: Promise.resolve({ slug: "missing-article" })
    });

    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBeUndefined();
  });
});
