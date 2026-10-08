import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MegaMenu } from "../components/layout/MegaMenu";
import { Navbar } from "../components/layout/Navbar";
import { megaMenus, primaryNavigation } from "../content/navigation";

vi.mock("next/navigation", () => ({
  usePathname: () => "/"
}));

function readWorkspaceFile(...segments: string[]) {
  return readFileSync(join(process.cwd(), ...segments), "utf8");
}

function getCssRule(source: string, selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(
    new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, "i")
  );

  expect(match, `Missing CSS rule: ${selector}`).not.toBeNull();
  return match![1];
}

function getRootClassTokens(markup: string, id: string) {
  const match = markup.match(
    new RegExp(`<div id="${id}"[^>]*class="([^"]+)"`)
  );

  expect(match, `Missing root class list for #${id}`).not.toBeNull();
  return match![1].split(/\s+/);
}

describe("enterprise navigation visuals", () => {
  it("keeps the primary desktop and mobile navigation structure", () => {
    const markup = renderToStaticMarkup(<Navbar />);

    expect(markup).toContain('aria-label="主导航"');
    expect(markup).toContain("首版认证");
    expect(markup).toContain("数字人格权资产服务");
    expect(markup).toContain('aria-label="打开主导航菜单"');
    expect(markup).toContain("h-16");
    expect(markup).toMatch(/class="[^"]*\bhidden\b[^"]*\blg:flex\b[^"]*"/);
    expect(markup).toMatch(
      /<button(?=[^>]*class="[^"]*\blg:hidden\b[^"]*")(?=[^>]*aria-label="打开主导航菜单")[^>]*>/
    );

    primaryNavigation.forEach((item) => {
      expect(markup).toContain(item.label);
    });
  });

  it("keeps every open mega-menu entry and desktop layout behavior", () => {
    Object.entries(megaMenus).forEach(([menuKey, menu]) => {
      const markup = renderToStaticMarkup(
        <MegaMenu id={`${menuKey}-menu`} menu={menu} open={true} />
      );
      const rootClassTokens = getRootClassTokens(
        markup,
        `${menuKey}-menu`
      );

      expect(markup).toContain("mega-menu-panel");
      expect(markup).toContain("absolute inset-x-0 top-full");
      expect(markup).toContain("lg:block");
      expect(markup).not.toContain("min-h-[390px]");
      expect(markup).toContain('role="region"');
      expect(markup).toContain(`aria-label="${menu.label}扩展导航"`);
      expect(markup).toContain('aria-hidden="false"');
      expect(markup).toContain('data-state="open"');
      expect(rootClassTokens).toContain("visible");
      expect(rootClassTokens).not.toContain("invisible");
      expect(rootClassTokens).toContain("pointer-events-auto");
      expect(markup).not.toContain('tabindex="-1"');
      expect(markup.match(/<section/g)).toHaveLength(menu.columns.length);

      menu.columns.forEach((column) => {
        expect(markup).toContain(column.title);

        column.links.forEach((link) => {
          expect(markup).toContain(link.label);
          expect(markup).toContain(link.description);
          expect(markup).toContain(`href="${link.href}"`);
        });
      });
    });
  });

  it("keeps a closed mega menu invisible and out of the tab order", () => {
    const menu = megaMenus.services;
    const markup = renderToStaticMarkup(
      <MegaMenu id="services-menu" menu={menu} open={false} />
    );
    const linkCount = menu.columns.reduce(
      (total, column) => total + column.links.length,
      0
    );
    const rootClassTokens = getRootClassTokens(markup, "services-menu");

    expect(markup).toContain("mega-menu-panel");
    expect(markup).toContain('role="region"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('data-state="closed"');
    expect(rootClassTokens).toContain("invisible");
    expect(rootClassTokens).not.toContain("visible");
    expect(rootClassTokens).toContain("pointer-events-none");
    expect(markup.match(/tabindex="-1"/g)).toHaveLength(linkCount);
  });

  it("uses the approved cobalt and warm-white navigation palette", () => {
    const navbarCss = readWorkspaceFile(
      "components",
      "layout",
      "Navbar.module.css"
    ).toLowerCase();
    const megaMenuCss = readWorkspaceFile(
      "components",
      "layout",
      "MegaMenu.module.css"
    ).toLowerCase();
    const navigationCss = `${navbarCss}\n${megaMenuCss}`;
    const prohibitedLegacyColors = [
      "#4f5d72",
      "#263651",
      "#36445a",
      "#5e6b80",
      "#71809a",
      "#52627a",
      "#5d6a7d",
      "#17233d",
      "#687287",
      "#4b5b72",
      "#5e6a7d",
      "#586579",
      "#7a8799"
    ];

    expect(navbarCss).toContain("#3347b8");
    expect(megaMenuCss).toContain("#3347b8");
    expect(megaMenuCss).toContain("#f6f3ec");
    expect(navigationCss).not.toMatch(/\bwhite\b/);
    prohibitedLegacyColors.forEach((color) => {
      expect(navigationCss).not.toContain(color);
    });
  });

  it("keeps backdrop filtering off the header containing block", () => {
    const navbarCss = readWorkspaceFile(
      "components",
      "layout",
      "Navbar.module.css"
    ).toLowerCase();
    const headerRule = getCssRule(navbarCss, ".header");

    expect(headerRule).not.toMatch(/(?:-webkit-)?backdrop-filter/);

    const headerBackdropRule = getCssRule(navbarCss, ".header::before");
    expect(headerRule).toContain("isolation: isolate");
    expect(headerBackdropRule).toContain("position: absolute");
    expect(headerBackdropRule).toContain("inset: 0");
    expect(headerBackdropRule).toContain("pointer-events: none");
    expect(headerBackdropRule).toMatch(
      /background:\s*#fff;[\s\S]*background:\s*color-mix/
    );
    expect(headerBackdropRule).toMatch(/(?:-webkit-)?backdrop-filter/);
  });

  it("constrains the desktop mega menu to the available viewport", () => {
    const megaMenuCss = readWorkspaceFile(
      "components",
      "layout",
      "MegaMenu.module.css"
    ).toLowerCase();
    const panelRule = getCssRule(megaMenuCss, ".panel");

    expect(panelRule).toContain("max-height: calc(100dvh - 4rem)");
    expect(panelRule).toContain("overflow-y: auto");
    expect(panelRule).toContain("overscroll-behavior: contain");
    expect(panelRule).toMatch(
      /background:\s*#fff;[\s\S]*background:\s*color-mix/
    );
  });

  it("uses a higher-contrast muted treatment in the warm first column", () => {
    const megaMenuCss = readWorkspaceFile(
      "components",
      "layout",
      "MegaMenu.module.css"
    ).toLowerCase();

    expect(megaMenuCss).toMatch(
      /\.column:first-child\s+\.primarycolumntitle,\s*\.column:first-child\s+\.primarylinkdescription,\s*\.column:first-child\s+\.arrow\s*\{[^}]*color:\s*color-mix\(in srgb,\s*#6b7280 75%,\s*#0b132b\)/
    );
  });

  it("animates the page recess only when reduced motion is not requested", () => {
    const globalsCss = readWorkspaceFile("app", "globals.css").toLowerCase();
    const baseRecessRule = getCssRule(globalsCss, ".nav-page-recess");

    expect(baseRecessRule).not.toContain("animation:");
    expect(globalsCss).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{[\s\S]*?\.nav-page-recess\s*\{[^}]*animation:\s*nav-recess-in/
    );
  });
});
