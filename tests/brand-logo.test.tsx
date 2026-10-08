import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrandMark } from "../components/brand/BrandMark";

const brandAssets = [
  {
    label: "public brand mark",
    path: ["public", "brand", "shouban-mark.svg"],
    colors: ["#0B132B", "#3347B8"]
  },
  {
    label: "monochrome brand mark",
    path: ["public", "brand", "shouban-mark-mono.svg"],
    colors: ["#0B132B"]
  },
  {
    label: "reverse brand mark",
    path: ["public", "brand", "shouban-mark-reverse.svg"],
    colors: ["#F6F3EC"]
  },
  {
    label: "horizontal brand logo",
    path: ["public", "brand", "shouban-logo-horizontal.svg"],
    colors: ["#0B132B", "#3347B8"]
  },
  {
    label: "app icon",
    path: ["app", "icon.svg"],
    colors: ["#0B132B", "#3347B8"]
  }
] as const;

function readSource(path: readonly string[]) {
  return readFileSync(join(process.cwd(), ...path), "utf8");
}

function getHexColors(svg: string) {
  return [
    ...new Set(
      (svg.match(/#[\da-f]{6}\b/gi) ?? []).map((color) => color.toUpperCase())
    )
  ].sort();
}

function normalizePaintValue(value: string) {
  const normalized = value.trim().replace(/\s*!important\s*$/i, "");

  return /^#[\da-f]{6}$/i.test(normalized)
    ? normalized.toUpperCase()
    : normalized;
}

function getPaintValues(svg: string) {
  const paintValues: string[] = [];

  for (const match of svg.matchAll(
    /(?:^|[\s<])(?:fill|stroke)\s*=\s*(["'])(.*?)\1/gi
  )) {
    paintValues.push(match[2]);
  }

  const styleSources = [
    ...Array.from(
      svg.matchAll(/(?:^|[\s<])style\s*=\s*(["'])([\s\S]*?)\1/gi),
      (match) => match[2]
    ),
    ...Array.from(
      svg.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi),
      (match) => match[1]
    )
  ];

  for (const style of styleSources) {
    for (const match of style.matchAll(
      /(?:^|[;{])\s*(?:fill|stroke)\s*:\s*([^;}]+)/gi
    )) {
      paintValues.push(match[1]);
    }
  }

  return [...new Set(paintValues.map(normalizePaintValue))].sort();
}

it("collects paint values from SVG attributes and style declarations", () => {
  const svg = `
    <svg>
      <path fill="red" stroke="rgb(1, 2, 3)" />
      <path style="fill: currentColor; stroke: rgba(0, 0, 0, 0.5)" />
      <style>.accent { fill: #3347b8; stroke: none; }</style>
    </svg>
  `;

  expect(getPaintValues(svg)).toEqual(
    [
      "#3347B8",
      "currentColor",
      "none",
      "red",
      "rgb(1, 2, 3)",
      "rgba(0, 0, 0, 0.5)"
    ].sort()
  );
});

describe("BrandMark", () => {
  it("renders the Shouban mark at the requested size as decorative imagery", () => {
    const markup = renderToStaticMarkup(<BrandMark size={32} />);

    expect(markup).toContain('src="/brand/shouban-mark.svg"');
    expect(markup).toContain('width="32"');
    expect(markup).toContain('height="32"');
    expect(markup).toContain('aria-hidden="true"');
  });

  it("preloads the brand mark when requested", () => {
    const markup = renderToStaticMarkup(<BrandMark size={32} preload />);

    expect(markup).toContain('rel="preload"');
    expect(markup).toContain("/brand/shouban-mark.svg");
  });
});

describe.each(brandAssets)("$label SVG", ({ path, colors }) => {
  it("uses only its approved solid brand palette", () => {
    const svg = readSource(path);

    expect(getHexColors(svg)).toEqual([...colors].sort());
    expect(getPaintValues(svg)).toEqual([...colors].sort());
  });

  it("contains no effects, embedded images, patterns, or opacity", () => {
    const svg = readSource(path);

    expect(svg).not.toMatch(/gradient|filter|shadow/i);
    expect(svg).not.toMatch(/<(?:pattern|image)\b/i);
    expect(svg).not.toMatch(/\b(?:[a-z-]+-)?opacity\s*(?:=|:)/i);
  });
});

it("represents the brand name with a real SVG text element in the horizontal logo", () => {
  const svg = readSource([
    "public",
    "brand",
    "shouban-logo-horizontal.svg"
  ]);

  expect(svg).toMatch(
    /<text\b[^>]*>\s*(?:首版认证|&#x9996;&#x7248;&#x8ba4;&#x8bc1;)\s*<\/text>/i
  );
});

describe("brand integration", () => {
  it.each([
    {
      label: "navbar",
      path: ["components", "layout", "Navbar.tsx"],
      renderPattern:
        /<BrandMark\b(?=[^>]*\bsize\s*=\s*\{32\})(?=[^>]*\bpreload\b)[^>]*\/>/,
      textPattern:
        /<BrandMark\b[^>]*\/>[\s\S]*?<span\b[^>]*>[\s\S]*?首版认证[\s\S]*?<\/span>/
    },
    {
      label: "footer",
      path: ["components", "layout", "Footer.tsx"],
      renderPattern: /<BrandMark\b(?=[^>]*\bsize\s*=\s*\{40\})[^>]*\/>/,
      textPattern:
        /<BrandMark\b[^>]*\/>[\s\S]*?<h2\b[^>]*>[\s\S]*?\{company\.name\}[\s\S]*?<\/h2>/
    }
  ])("renders BrandMark and HTML brand text in the $label", ({ path, renderPattern, textPattern }) => {
    const source = readSource(path);

    expect(source).toMatch(
      /import\s+\{\s*BrandMark\s*\}\s+from\s+["']@\/components\/brand\/BrandMark["']/
    );
    expect(source).toMatch(renderPattern);
    expect(source).toMatch(textPattern);
    expect(source).not.toContain("ShieldCheck");
  });

  it("declares the SVG app icon and brand-colored browser theme", () => {
    const source = readSource(["app", "layout.tsx"]);

    expect(source).toMatch(/url\s*:\s*["']\/icon\.svg["']/);
    expect(source).toMatch(/themeColor\s*:\s*["']#0B132B["']/);
  });
});
