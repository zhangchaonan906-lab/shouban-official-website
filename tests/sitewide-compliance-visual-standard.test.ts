import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss, { type AtRule, type Root, type Rule } from "postcss";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const businessRoutes = [
  "app/solutions/page.tsx",
  "app/aipr/page.tsx",
  "app/services/page.tsx",
  "app/trust/page.tsx",
  "app/compliance/page.tsx",
  "app/about/page.tsx",
  "app/news/page.tsx"
] as const;

const legalRoutes = [
  "app/privacy/page.tsx",
  "app/disclaimer/page.tsx"
] as const;

const requiredTokens = {
  "--sb-white": "#ffffff",
  "--sb-ink": "#0b132b",
  "--sb-cobalt": "#3347b8",
  "--sb-ivory": "#f6f3ec",
  "--sb-air": "#f7faff",
  "--sb-mist": "#edf3ff",
  "--sb-section-landing": "clamp(56px, 5.5vw, 80px)",
  "--sb-section-tail": "clamp(24px, 3vw, 32px)",
  "--sb-handoff-height": "clamp(30px, 4vw, 44px)",
  "--sb-panel-radius": "24px",
  "--sb-panel-radius-mobile": "18px",
  "--sb-container": "1280px"
} as const;

function directRule(root: Root | AtRule, selector: string) {
  const matches = (root.nodes ?? []).filter(
    (node): node is Rule =>
      node.type === "rule" &&
      node.selectors.map((item) => item.trim()).includes(selector)
  );

  expect(matches, `expected one ${selector} rule`).toHaveLength(1);
  return matches[0];
}

function declarations(rule: Rule) {
  return new Map(
    rule.nodes
      .filter((node) => node.type === "decl")
      .map((node) => [node.prop, node.value])
  );
}

function declarationsForSelector(root: Root, selector: string) {
  const values = new Map<string, string>();

  root.walkRules((rule) => {
    if (!rule.selectors.map((item) => item.trim()).includes(selector)) {
      return;
    }

    rule.walkDecls((declaration) => {
      values.set(declaration.prop, declaration.value);
    });
  });

  return values;
}

describe("sitewide compliance visual standard", () => {
  it("defines the approved palette, geometry and handoff rhythm once at root", () => {
    const root = postcss.parse(read("app/globals.css"));
    const rootDeclarations = declarations(directRule(root, ":root"));

    for (const [property, value] of Object.entries(requiredTokens)) {
      expect(rootDeclarations.get(property), property).toBe(value);
    }
  });

  it("uses a clean white page canvas instead of a diagonal page-wide gradient", () => {
    const root = postcss.parse(
      read("components/common/InteriorPageFrame.module.css")
    );
    const page = declarations(directRule(root, ".page"));

    expect(page.get("background")).toBe("var(--sb-white)");
    expect(page.get("overflow-x")).toBe("clip");
    expect(page.get("min-width")).toBe("0");
    expect(page.get("background")).not.toContain("linear-gradient");
  });

  it("provides one shared section band for spacing and containment", () => {
    const path = "components/common/SectionBand.module.css";
    expect(existsSync(resolve(process.cwd(), path))).toBe(true);

    const root = postcss.parse(read(path));
    const section = declarations(directRule(root, ".section"));
    const mobile = (root.nodes ?? []).find(
      (node): node is AtRule =>
        node.type === "atrule" &&
        node.name === "media" &&
        node.params.trim() === "(max-width: 809px)"
    );

    expect(section.get("position")).toBe("relative");
    expect(section.get("min-width")).toBe("0");
    expect(section.get("overflow")).toBe("clip");
    expect(section.get("padding-block-start")).toBe(
      "var(--sb-section-landing)"
    );
    expect(section.get("padding-block-end")).toBe(
      "calc(var(--sb-section-tail) + var(--sb-handoff-height))"
    );

    expect(mobile).toBeTruthy();
    const mobileSection = declarations(directRule(mobile!, ".section"));
    expect(mobileSection.get("padding-block-start")).toBe("56px");
    expect(mobileSection.get("padding-block-end")).toBe("50px");
  });

  it("uses a short responsive handoff instead of the former 128px slab", () => {
    const root = postcss.parse(
      read("components/common/SectionGradient.module.css")
    );

    for (const selector of [
      ".whiteToBlue",
      ".blueToIvory",
      ".ivoryToWhite",
      ".blueToWhite"
    ]) {
      const rule = declarationsForSelector(root, selector);

      expect(rule.get("background-size"), selector).toBe(
        "100% var(--sb-handoff-height)"
      );
      expect(rule.get("background-size"), selector).not.toContain("128px");
    }
  });

  it("migrates business and legal page sections off ad-hoc py utilities", () => {
    for (const path of [...businessRoutes, ...legalRoutes]) {
      const source = read(path);

      expect(source, path).toContain(
        'import { SectionBand } from "@/components/common/SectionBand";'
      );
      expect(source, path).not.toMatch(/<section[^>]*\bpy-16\b/);
      expect(source, path).not.toMatch(/<section[^>]*\bsm:py-20\b/);
    }
  });

  it("aligns the default CTA to the 1280px mother grid with a protected footer gap", () => {
    const root = postcss.parse(read("components/common/CTASection.module.css"));
    const surface = declarations(directRule(root, ".fluentSurface"));

    expect(surface.get("width")).toBe(
      "min(calc(100% - 64px), var(--sb-container))"
    );
    expect(surface.get("margin")).toBe("0 auto");
    expect(surface.get("margin-block-end")).toBe(
      "clamp(56px, 5vw, 80px)"
    );
    expect(surface.get("min-width")).toBe("0");
  });

  it("keeps the already approved homepage service-to-process transition intact", () => {
    const service = read("components/home/HomeServiceGrid.module.css");
    const process = read("components/home/HomeProcess.module.css");

    expect(service).toContain(
      "padding-bottom: clamp(24px, 3vw, 32px);"
    );
    expect(service).toContain("height: clamp(30px, 4vw, 44px);");
    expect(process).toContain(
      "padding-block: clamp(56px, 5.5vw, 80px) clamp(64px, 6vw, 88px);"
    );
  });

  it("does not reintroduce oversized mobile handoff slabs", () => {
    for (const path of [
      "components/home/HomePositioning.module.css",
      "components/home/HomeAiprCapabilities.module.css",
      "components/home/HomeResearch.module.css"
    ]) {
      expect(read(path), path).not.toContain("background-size: 100% 96px");
    }
  });

  it("uses one 809px breakpoint for shared interior surfaces", () => {
    for (const path of [
      "components/common/PageHero.module.css",
      "components/common/FluentSurface.module.css",
      "components/common/CTASection.module.css"
    ]) {
      const css = read(path);
      expect(css, path).toContain("@media (max-width: 809px)");
      expect(css, path).not.toContain("@media (max-width: 719px)");
      expect(css, path).not.toContain("@media (max-width: 640px)");
    }
  });

  it("keeps the contact experience on the shared mother grid", () => {
    const css = read("app/globals.css");

    expect(css).toMatch(
      /\.contact-interactive-shell\s*\{[^}]*width:\s*min\(calc\(100% - 64px\),\s*var\(--sb-container\)\)/s
    );
    expect(css).not.toMatch(/\.contact-interactive-shell\s*\{[^}]*width:\s*min\(1520px/s);
    expect(css).not.toMatch(
      /@media\s*\(max-width:\s*1439px\)[\s\S]*?\.contact-interactive-shell\s*\{[^}]*width:\s*min\(1320px/s
    );
  });

  it("brings the 404 recovery state into the same visual system", () => {
    const source = read("app/not-found.tsx");

    expect(source).toContain(
      'import { InteriorPageFrame } from "@/components/common/InteriorPageFrame";'
    );
    expect(source).toContain(
      'import { SectionBand } from "@/components/common/SectionBand";'
    );
    expect(source).toContain("surfaceStyles.elevated");
    expect(source).toContain('<SectionBand tone="blueToWhite"');
  });
});
