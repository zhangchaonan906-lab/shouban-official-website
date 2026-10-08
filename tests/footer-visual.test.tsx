import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Footer } from "../components/layout/Footer";

function extractMediaBlockContents(css: string, query: string) {
  const blocks: string[] = [];
  const marker = `@media ${query}`;
  let searchFrom = 0;

  while (searchFrom < css.length) {
    const mediaStart = css.indexOf(marker, searchFrom);
    if (mediaStart === -1) break;

    const openingBrace = css.indexOf("{", mediaStart + marker.length);
    if (openingBrace === -1) break;

    if (css.slice(mediaStart + marker.length, openingBrace).trim()) {
      searchFrom = mediaStart + marker.length;
      continue;
    }

    let depth = 0;
    let closingBrace = -1;

    for (let index = openingBrace; index < css.length; index += 1) {
      if (css[index] === "{") depth += 1;
      if (css[index] === "}") depth -= 1;

      if (depth === 0) {
        closingBrace = index;
        break;
      }
    }

    if (closingBrace === -1) break;

    blocks.push(css.slice(openingBrace + 1, closingBrace));
    searchFrom = closingBrace + 1;
  }

  return blocks;
}

function stripMediaBlocks(css: string) {
  const topLevelCss: string[] = [];
  let searchFrom = 0;

  while (searchFrom < css.length) {
    const mediaStart = css.indexOf("@media", searchFrom);
    if (mediaStart === -1) {
      topLevelCss.push(css.slice(searchFrom));
      break;
    }

    topLevelCss.push(css.slice(searchFrom, mediaStart));

    const openingBrace = css.indexOf("{", mediaStart + "@media".length);
    if (openingBrace === -1) break;

    let depth = 0;
    let closingBrace = -1;

    for (let index = openingBrace; index < css.length; index += 1) {
      if (css[index] === "{") depth += 1;
      if (css[index] === "}") depth -= 1;

      if (depth === 0) {
        closingBrace = index;
        break;
      }
    }

    if (closingBrace === -1) break;
    searchFrom = closingBrace + 1;
  }

  return topLevelCss.join("");
}

function extractRuleContents(css: string, selector: string) {
  const selectorStart = css.indexOf(selector);

  if (selectorStart === -1) {
    throw new Error(`Could not find CSS selector: ${selector}`);
  }

  const openingBrace = css.indexOf("{", selectorStart + selector.length);

  if (openingBrace === -1) {
    throw new Error(`Could not find opening brace for CSS selector: ${selector}`);
  }

  let depth = 0;

  for (let index = openingBrace; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") depth -= 1;

    if (depth === 0) {
      return css.slice(openingBrace + 1, index);
    }
  }

  throw new Error(`Could not find closing brace for CSS selector: ${selector}`);
}

function extractDeclarationValue(ruleContents: string, property: string) {
  const match = ruleContents.match(new RegExp(`${property}\\s*:\\s*([\\s\\S]*?);`));

  if (!match) {
    throw new Error(`Could not find CSS declaration: ${property}`);
  }

  return match[1].replace(/\s+/g, "");
}

describe("Footer visual treatment", () => {
  it("organizes footer text into compact blocks with a horizontal business link strip", () => {
    const markup = renderToStaticMarkup(<Footer />);

    expect(markup).toContain("w-full");
    expect(markup).toContain("pt-8 pb-5");
    expect(markup).toContain("lg:grid-cols-[1.1fr_1.25fr_0.95fr]");
    expect(markup).toContain("grid gap-6");
    expect(markup.match(/border-t border-slate-200/g) ?? []).toHaveLength(0);
    expect(markup).toContain('aria-labelledby="footer-business-heading" class="mt-10"');
    expect(markup).toContain('class="mt-9 text-[11px] text-slate-500"');
    expect(markup).toContain("gap-x-4");
    expect(markup).toContain("业务链接");
    expect(markup).toContain("数字人格权资产认证");
    expect(markup).toContain("AIGC合规");
    expect(markup).toContain("备案号");
    expect(markup).toContain("All rights reserved");
    expect(markup).not.toContain("mx-auto max-w-[820px]");
    expect(markup).not.toContain("mx-auto max-w-5xl");
    expect(markup).not.toContain("gap-10");
    expect(markup).not.toContain("mt-6 border-t border-slate-200 pt-4");
    expect(markup).not.toContain("mt-5 border-t border-slate-200 pt-4 text-[11px] text-slate-500");
    expect(markup).not.toContain("lg:grid-cols-[1.25fr_0.75fr_0.75fr_1fr]");
  });

  it("removes the boundary between the homepage contact CTA and footer", () => {
    const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
    const desktopCss = stripMediaBlocks(css);
    const contactCtaRule = extractRuleContents(desktopCss, ".home-contact-cta");

    expect(extractDeclarationValue(contactCtaRule, "border-top")).toBe("1pxsolid#dbe5ee");
    expect(extractDeclarationValue(contactCtaRule, "border-bottom")).toBe("0");
  });

  it("renders the shared grass video contract for every footer", () => {
    const markup = renderToStaticMarkup(<Footer />);

    expect(markup).toContain("footer-video-media");
    expect(markup).toContain("/video/home-growth-cta.mp4");
    expect(markup).toContain("/images/home/home-growth-cta-poster.jpg");
    expect(markup).toContain("autoPlay");
    expect(markup).toContain("muted");
    expect(markup).toContain("loop");
    expect(markup).toContain("playsInline");
    expect(markup).not.toContain("/images/footer/blue-floral-footer.png");
  });

  it("keeps FooterMedia server-renderable and independent of routing", () => {
    const source = readFileSync(
      join(process.cwd(), "components", "layout", "FooterMedia.tsx"),
      "utf8"
    );

    expect(source).not.toContain("use client");
    expect(source).not.toContain("usePathname");
    expect(source).not.toContain("next/navigation");
    expect(source).not.toContain("blue-floral-footer.png");
  });

  it("uses the exact desktop footer video crop", () => {
    const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
    const desktopCss = stripMediaBlocks(css);

    expect(desktopCss).toMatch(
      /\.footer-video-media__poster,\s*\.footer-video-media__video\s*\{[^}]*object-position:\s*center 28%\s*;/s
    );
  });

  it("uses exactly one translucent vertical footer wash on desktop", () => {
    const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
    const desktopCss = stripMediaBlocks(css);
    const washRule = extractRuleContents(desktopCss, ".footer-video-media__wash");
    const washBackground = extractDeclarationValue(washRule, "background");

    expect(washBackground.match(/linear-gradient\(/g) ?? []).toHaveLength(1);
    expect(washBackground).not.toContain("linear-gradient(90deg");
    expect(washBackground).toBe(
      "linear-gradient(180deg,rgba(248,251,255,0.78)0%,rgba(248,251,255,0.46)52%,rgba(248,251,255,0.26)100%)"
    );
  });

  it("uses the exact mobile footer video crop", () => {
    const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
    const mobileCss = extractMediaBlockContents(css, "(max-width: 639px)").join("\n");

    expect(mobileCss).toMatch(
      /\.footer-video-media__poster,\s*\.footer-video-media__video\s*\{[^}]*object-position:\s*78% 46%\s*;/s
    );
  });

  it("uses exactly one translucent vertical footer wash on mobile", () => {
    const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
    const mobileCss = extractMediaBlockContents(css, "(max-width: 639px)").join("\n");
    const washRule = extractRuleContents(mobileCss, ".footer-video-media__wash");
    const washBackground = extractDeclarationValue(washRule, "background");

    expect(washBackground.match(/linear-gradient\(/g) ?? []).toHaveLength(1);
    expect(washBackground).not.toContain("linear-gradient(90deg");
    expect(washBackground).toBe(
      "linear-gradient(180deg,rgba(248,251,255,0.88)0%,rgba(248,251,255,0.78)48%,rgba(248,251,255,0.68)100%)"
    );
  });

  it("keeps footer video fitting and reduced-motion fallback styling", () => {
    const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
    const reducedMotionCss = extractMediaBlockContents(css, "(prefers-reduced-motion: reduce)").join("\n");

    expect(css).toMatch(/\.footer-video-media__video[^{]*\{[^}]*object-fit:\s*cover/s);
    expect(reducedMotionCss).toMatch(/\.footer-video-media__video[^{]*\{[^}]*display:\s*none/s);
  });

});
