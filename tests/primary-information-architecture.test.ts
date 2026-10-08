import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { primaryNavigation, secondaryNavigation } from "../content/navigation";
import { solutions } from "../content/solutions";
import sitemap from "../app/sitemap";
import { routes, siteUrl } from "../lib/constants";

describe("primary information architecture", () => {
  it("exposes the approved seven top-level destinations in order", () => {
    expect(primaryNavigation.map(({ label, href }) => [label, href])).toEqual([
      ["首页", "/"],
      ["解决方案", "/solutions"],
      ["星眸AIPR", "/aipr"],
      ["服务与产品", "/services"],
      ["技术与可信", "/trust"],
      ["合规与研究", "/compliance"],
      ["关于首版与联系", "/about"]
    ]);
  });

  it("keeps news and contact as discoverable secondary destinations", () => {
    expect(secondaryNavigation).toEqual([
      { label: "新闻与研究", href: "/news" },
      { label: "联系我们", href: "/contact" }
    ]);
  });

  it("publishes real solutions and trust routes", () => {
    expect(routes).toContain("/solutions");
    expect(routes).toContain("/trust");

    const sitemapUrls = sitemap().map((entry) => entry.url);
    expect(sitemapUrls).toContain(`${siteUrl}/solutions`);
    expect(sitemapUrls).toContain(`${siteUrl}/trust`);

    const solutionsPage = readFileSync(
      join(process.cwd(), "app", "solutions", "page.tsx"),
      "utf8"
    );
    expect(solutionsPage).not.toContain('redirect("/")');
    expect(solutionsPage).toContain("solutions.map");

    expect(existsSync(join(process.cwd(), "app", "trust", "page.tsx"))).toBe(
      true
    );
  });

  it("provides complete role-based solution content", () => {
    expect(solutions).toHaveLength(6);
    solutions.forEach((solution) => {
      expect(solution.audience).toBeTruthy();
      expect(solution.title).toBeTruthy();
      expect(solution.description).toBeTruthy();
      expect(solution.capabilities.length).toBeGreaterThanOrEqual(3);
    });
  });
});
