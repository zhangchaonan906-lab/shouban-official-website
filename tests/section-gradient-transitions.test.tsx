import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse, type Declaration, type Root } from "postcss";
import { describe, expect, it } from "vitest";

const cssPath = resolve(
  process.cwd(),
  "components/common/SectionGradient.module.css"
);

const transitionGradients = {
  ".horizonToBlue":
    "linear-gradient(180deg, #f4f8ff 0%, var(--sb-air) 52%, var(--sb-mist) 100%)",
  ".whiteToBlue":
    "linear-gradient(180deg, var(--sb-white) 0%, var(--sb-air) 56%, var(--sb-mist) 100%)",
  ".blueToIvory":
    "linear-gradient(180deg, var(--sb-mist) 0%, var(--sb-air) 58%, var(--sb-ivory) 100%)",
  ".ivoryToWhite":
    "linear-gradient(180deg, var(--sb-ivory) 0%, var(--sb-air) 58%, var(--sb-white) 100%)",
  ".blueToWhite":
    "linear-gradient(180deg, var(--sb-mist) 0%, var(--sb-air) 58%, var(--sb-white) 100%)",
  ".blueWash":
    "linear-gradient(180deg, var(--sb-air) 0%, var(--sb-air) 32%, var(--sb-mist) 66%, var(--sb-air) 100%)",
  ".ivoryWash":
    "linear-gradient(180deg, var(--sb-ivory) 0%, var(--sb-ivory) 32%, var(--sb-air) 66%, var(--sb-ivory) 100%)"
} as const;

const selectors = Object.keys(transitionGradients);
const approvedSelectors = [...selectors];
const approvedColors = new Set([
  "#ffffff",
  "#f4f8ff",
  "#f7faff",
  "#edf3ff",
  "#f6f3ec"
]);
const allowedNonColorTokens = new Set([
  "linear-gradient",
  "deg",
  "px",
  "relative",
  "isolate",
  "no-repeat",
  "center",
  "bottom"
  ,"var"
  ,"-sb-white"
  ,"-sb-air"
  ,"-sb-mist"
  ,"-sb-ivory"
  ,"-sb-handoff-height"
]);
const allowedProperties = new Set([
  "position",
  "isolation",
  "background-repeat",
  "background-image",
  "background-color",
  "background-position",
  "background-size"
]);

const fixedDepthTransitions = {
  ".horizonToBlue": "var(--sb-mist)",
  ".whiteToBlue": "var(--sb-white)",
  ".blueToIvory": "var(--sb-mist)",
  ".ivoryToWhite": "var(--sb-ivory)",
  ".blueToWhite": "var(--sb-mist)"
} as const;

function findUnapprovedColorTokens(root: Root) {
  const unapproved: string[] = [];

  root.walkDecls((declaration) => {
    const withoutHexColors = declaration.value.replace(
      /#[\da-f]{3,8}\b/gi,
      (match) => {
        const color = match.toLowerCase();

        if (!approvedColors.has(color)) {
          unapproved.push(color);
        }

        return " ";
      }
    );

    for (const match of withoutHexColors.matchAll(/-?[a-z_][\w-]*/gi)) {
      const color = match[0].toLowerCase();

      if (!allowedNonColorTokens.has(color)) {
        unapproved.push(color);
      }
    }
  });

  return unapproved;
}

function findUnapprovedDeclarations(root: Root) {
  const unapproved: string[] = [];

  root.walkDecls((declaration) => {
    const property = declaration.prop.toLowerCase();

    if (allowedProperties.has(property)) {
      return;
    }

    const owner =
      declaration.parent?.type === "rule"
        ? declaration.parent.selector
        : "unknown selector";
    unapproved.push(`${owner}: ${property}`);
  });

  return unapproved;
}

function auditClassSelectors(root: Root) {
  const actual: string[] = [];

  root.walkRules((rule) => {
    for (const selector of rule.selectors) {
      actual.push(selector.trim());
    }
  });

  const recognized = new Set(
    actual.filter((selector) => selectors.includes(selector))
  );

  return {
    missing: selectors.filter((selector) => !recognized.has(selector)),
    unexpected: actual.filter((selector) => !approvedSelectors.includes(selector))
  };
}

function loadStyles() {
  expect(
    existsSync(cssPath),
    "expected components/common/SectionGradient.module.css to exist"
  ).toBe(true);

  return parse(readFileSync(cssPath, "utf8"), { from: cssPath });
}

function declarationsFor(root: Root, selector: string, property: string) {
  const declarations: Declaration[] = [];

  root.walkRules((rule) => {
    if (!rule.selectors.map((item) => item.trim()).includes(selector)) {
      return;
    }

    rule.nodes.forEach((node) => {
      if (
        node.type === "decl" &&
        node.prop.toLowerCase() === property.toLowerCase()
      ) {
        declarations.push(node);
      }
    });
  });

  return declarations;
}

function declarationValue(root: Root, selector: string, property: string) {
  const declarations = declarationsFor(root, selector, property);

  expect(
    declarations,
    `expected one ${property} declaration for ${selector}`
  ).toHaveLength(1);

  return declarations[0].value.replace(/\s+/g, " ").trim();
}

describe("section gradient transitions", () => {
  it("renders each transition inside the section without changing layout height", () => {
    const root = loadStyles();

    for (const selector of selectors) {
      expect(declarationValue(root, selector, "position")).toBe("relative");
      expect(declarationValue(root, selector, "isolation")).toBe("isolate");
      expect(declarationValue(root, selector, "background-repeat")).toBe(
        "no-repeat"
      );
      expect(declarationValue(root, selector, "background-image")).toBe(
        transitionGradients[selector as keyof typeof transitionGradients]
      );
    }
  });

  it("keeps long sections on a stable base color and limits handoffs to the shared short depth", () => {
    const root = loadStyles();

    for (const [selector, baseColor] of Object.entries(fixedDepthTransitions)) {
      expect(declarationValue(root, selector, "background-color")).toBe(
        baseColor
      );
      expect(declarationValue(root, selector, "background-position")).toBe(
        "center bottom"
      );
      expect(declarationValue(root, selector, "background-size")).toBe(
        "100% var(--sb-handoff-height)"
      );
    }
  });

  it("does not append full-width slabs that add blank space to every section", () => {
    const root = loadStyles();

    for (const selector of selectors) {
      const transitionSelector = `${selector}::after`;
      expect(declarationsFor(root, transitionSelector, "height")).toHaveLength(0);
      expect(declarationsFor(root, transitionSelector, "content")).toHaveLength(0);
      expect(declarationsFor(root, transitionSelector, "background-image")).toHaveLength(0);
    }
  });

  it("uses only the approved section gradient hex colors", () => {
    const root = loadStyles();

    expect(findUnapprovedColorTokens(root)).toEqual([]);
  });

  it("uses only the approved section gradient properties", () => {
    const root = loadStyles();

    expect(findUnapprovedDeclarations(root)).toEqual([]);
  });

  it("contains only the seven approved classes", () => {
    const root = loadStyles();

    expect(auditClassSelectors(root)).toEqual({ missing: [], unexpected: [] });
  });

  it("rejects functional and named color expressions", () => {
    const fixture = parse(`
      .fixture {
        --rgb: rgb(1 2 3);
        --rgba: rgba(1, 2, 3, 0.5);
        --hsl: hsl(0 100% 50%);
        --hsla: hsla(0, 100%, 50%, 0.5);
        --named: red;
        --current: currentColor;
        --mixed: color-mix(in srgb, #ffffff, #edf3ff);
      }
    `);

    expect(findUnapprovedColorTokens(fixture)).toEqual(
      expect.arrayContaining([
        "rgb",
        "rgba",
        "hsl",
        "hsla",
        "red",
        "currentcolor",
        "color-mix"
      ])
    );
  });

  it("rejects forbidden declarations owned by an extra class", () => {
    const fixture = parse(`
      .extra {
        padding: 1rem;
        box-shadow: none;
      }
    `);

    expect(findUnapprovedDeclarations(fixture)).toEqual([
      ".extra: padding",
      ".extra: box-shadow"
    ]);
  });

  it("rejects declarations outside the section gradient property whitelist", () => {
    const fixture = parse(`
      .whiteToBlue {
        opacity: 0.5;
        z-index: 1;
      }
    `);

    expect(findUnapprovedDeclarations(fixture)).toEqual([
      ".whiteToBlue: opacity",
      ".whiteToBlue: z-index"
    ]);
  });

  it("rejects any selector outside the seven approved classes", () => {
    const fixture = parse(`
      .horizonToBlue,
      .whiteToBlue,
      .blueToIvory,
      .ivoryToWhite,
      .blueToWhite,
      .blueWash,
      .ivoryWash {}
      .sixthClass {}
      #gradient {}
      section {}
      .whiteToBlue:hover {}
    `);

    expect(auditClassSelectors(fixture)).toEqual({
      missing: [],
      unexpected: [
        ".sixthClass",
        "#gradient",
        "section",
        ".whiteToBlue:hover"
      ]
    });
  });
});
