import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const businessPageSequences = {
  "app/solutions/page.tsx": ["blueToIvory", "ivoryToWhite"],
  "app/services/page.tsx": ["blueToWhite"],
  "app/aipr/page.tsx": ["blueToIvory", "ivoryToWhite"],
  "app/trust/page.tsx": ["blueToIvory", "ivoryToWhite"],
  "app/compliance/page.tsx": ["blueToWhite"],
  "app/news/page.tsx": ["blueToWhite"],
  "app/about/page.tsx": ["blueToIvory", "ivoryToWhite"]
} as const;

const sharedImport =
  'import { SectionBand } from "@/components/common/SectionBand";';

function gradientVariants(source: string) {
  return [...source.matchAll(/<SectionBand\b[^>]*tone="(\w+)"/g)].map(
    ([, variant]) => variant
  );
}

function ruleDeclarations(path: string, selector: string) {
  const root = postcss.parse(read(path));
  const declarations = new Map<string, string>();

  root.walkRules(selector, (rule) => {
    rule.walkDecls((declaration) => {
      declarations.set(declaration.prop, declaration.value);
    });
  });

  return declarations;
}

describe("business-page section gradient transitions", () => {
  it("applies the approved alternating gradient sequence to every business section", () => {
    for (const [path, expectedSequence] of Object.entries(
      businessPageSequences
    )) {
      const source = read(path);

      expect(source, path).toContain(sharedImport);
      expect(source, path).not.toMatch(
        /<section\s+className=["{][^>]*\bbg-transparent\b/
      );
      expect(gradientVariants(source), path).toEqual(expectedSequence);

      for (const variant of expectedSequence) {
        expect(source, `${path}: ${variant}`).toContain(
          `<SectionBand tone="${variant}"`
        );
      }
      expect(source, path).not.toMatch(/\bpy-16\b|\bsm:py-20\b/);
    }
  });

  it("uses the shared blue-to-white handoff on both contact readiness stages", () => {
    const source = read("app/contact/page.tsx");

    expect(source).toContain(sharedImport);
    expect(gradientVariants(source)).toEqual(["blueToWhite", "blueToWhite"]);
    expect(
      source.match(
        /<SectionBand(?:\s|\n)+tone="blueToWhite"(?:\s|\n)+className="contact-page-stage(?: contact-page-stage--readiness)?"\s*>/g
      )
    ).toHaveLength(2);

    const stageDeclarations = ruleDeclarations(
      "app/globals.css",
      ".contact-page-stage"
    );
    expect(stageDeclarations.has("background")).toBe(false);
    expect(stageDeclarations.has("background-image")).toBe(false);
  });

  it("ends PageHero at the exact blue edge consumed by the first content section", () => {
    const heroDeclarations = ruleDeclarations(
      "components/common/PageHero.module.css",
      ".hero"
    );

    expect(heroDeclarations.get("background")).toBe(
      "linear-gradient(\n    180deg,\n    var(--sb-ivory) 0%,\n    var(--sb-air) 54%,\n    var(--sb-mist) 86%,\n    var(--sb-mist) 100%\n  )"
    );
  });

  it("keeps legal and news reading canvases white inside a shared handoff", () => {
    const legalReadingPages = [
      "app/privacy/page.tsx",
      "app/disclaimer/page.tsx",
      "app/news/[slug]/page.tsx"
    ];

    for (const path of legalReadingPages) {
      expect(read(path), path).toContain("SectionBand");
      expect(read(path), path).toContain('tone="blueToWhite"');
    }

    expect(read("app/privacy/page.tsx")).toContain(
      'className="privacy-policy-section"'
    );
    expect(read("app/globals.css")).toMatch(
      /\.privacy-policy\s*\{[^}]*background:\s*rgb\(255 255 255 \/ 88%\)/s
    );
    expect(read("app/disclaimer/page.tsx")).toContain(
      "surfaceStyles.standard"
    );
    expect(read("app/news/[slug]/page.tsx")).toContain(
      "surfaceStyles.standard"
    );
  });
});
