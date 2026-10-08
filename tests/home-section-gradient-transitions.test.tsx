import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss from "postcss";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const homepageSequence = [
  "HomeAudienceBand",
  "HomePositioning",
  "HomeAiprCapabilities",
  "HomeScenarioStrip",
  "HomeServiceGrid",
  "HomeProcess",
  "HomeResearch",
  "CTASection"
] as const;

const gradientVariants = [
  "horizonToBlue",
  "whiteToBlue",
  "blueToIvory",
  "ivoryToWhite",
  "blueWash",
  "ivoryWash"
] as const;

type GradientVariant = (typeof gradientVariants)[number];

const gradientAssignments = [
  {
    component: "components/home/HomeAudienceBand.tsx",
    css: "components/home/HomeAudienceBand.module.css",
    rootStyle: "band",
    rootSelector: ".band",
    variant: "horizonToBlue"
  },
  {
    component: "components/home/HomePositioning.tsx",
    css: "components/home/HomePositioning.module.css",
    rootStyle: "section",
    rootSelector: ".section",
    variant: "blueToIvory"
  },
  {
    component: "components/home/HomeAiprCapabilities.tsx",
    css: "components/home/HomeAiprCapabilities.module.css",
    rootStyle: "section",
    rootSelector: ".section",
    variant: "ivoryToWhite"
  },
  {
    component: "components/home/HomeResearch.tsx",
    css: "components/home/HomeResearch.module.css",
    rootStyle: "qualificationsSection",
    rootSelector: ".qualificationsSection",
    variant: "whiteToBlue"
  },
  {
    component: "components/home/HomeResearch.tsx",
    css: "components/home/HomeResearch.module.css",
    rootStyle: "researchSection",
    rootSelector: ".researchSection",
    variant: "blueToIvory"
  }
] as const satisfies readonly {
  component: string;
  css: string;
  rootStyle: string;
  rootSelector: string;
  variant: GradientVariant;
}[];

type GradientAssignment = (typeof gradientAssignments)[number];

function findJsxAttribute(
  node: ts.JsxOpeningLikeElement,
  name: string
): ts.JsxAttribute | undefined {
  return node.attributes.properties.find(
    (property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) && property.name.getText() === name
  );
}

function propertyAccessTokens(node: ts.Node, namespace: string) {
  const tokens = new Set<string>();

  const visit = (child: ts.Node) => {
    if (
      ts.isPropertyAccessExpression(child) &&
      ts.isIdentifier(child.expression) &&
      child.expression.text === namespace
    ) {
      tokens.add(child.name.text);
    }
    ts.forEachChild(child, visit);
  };

  visit(node);
  return tokens;
}

function auditSectionGradients(source: string, path = "fixture.tsx") {
  const sourceFile = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const sections = new Map<string, Set<string>>();
  let importsSharedModule = false;

  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text.endsWith("SectionGradient.module.css") &&
      statement.importClause?.name?.text === "gradientStyles"
    ) {
      importsSharedModule = true;
    }
  }

  const visit = (node: ts.Node) => {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText(sourceFile) === "section"
    ) {
      const className = findJsxAttribute(node, "className");
      if (className?.initializer) {
        const rootStyles = propertyAccessTokens(className.initializer, "styles");
        const gradients = propertyAccessTokens(
          className.initializer,
          "gradientStyles"
        );

        for (const rootStyle of rootStyles) {
          sections.set(rootStyle, gradients);
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return { importsSharedModule, sections };
}

function declarationsForSelector(css: string, selector: string) {
  const declarations = new Set<string>();

  postcss.parse(css).walkRules((rule) => {
    if (rule.selectors.includes(selector)) {
      rule.walkDecls((declaration) => {
        declarations.add(declaration.prop);
      });
    }
  });

  return declarations;
}

function hasMobileBackgroundSizing(
  css: string,
  selectors: readonly string[],
  expectedSize = "100% 96px"
) {
  const matchedSelectors = new Set<string>();

  postcss.parse(css).walkAtRules("media", (media) => {
    if (!/max-width\s*:\s*(?:640|809|810)px/i.test(media.params)) {
      return;
    }

    media.walkRules((rule) => {
      const ownsMobileSizing = rule.nodes.some(
        (node) =>
          node.type === "decl" &&
          node.prop === "background-size" &&
          node.value === expectedSize
      );

      if (ownsMobileSizing) {
        for (const selector of selectors) {
          if (rule.selectors.includes(selector)) {
            matchedSelectors.add(selector);
          }
        }
      }
    });
  });

  return selectors.every((selector) => matchedSelectors.has(selector));
}

describe("homepage section gradient transitions", () => {
  it("finds an applied gradient when class tokens are reordered across lines", () => {
    const multilineSource = `
      import gradientStyles from "@/components/common/SectionGradient.module.css";
      import styles from "./fixture.module.css";

      export function Fixture() {
        return (
          <section
            className={\`
              \${gradientStyles.whiteToBlue}
              scroll-reveal
              \${styles.section}
            \`}
          />
        );
      }
    `;
    const audit = auditSectionGradients(multilineSource);

    expect(audit.importsSharedModule).toBe(true);
    expect(audit.sections.get("section")).toContain("whiteToBlue");
  });

  it("accepts equivalent split mobile selector rules", () => {
    const splitSelectorCss = `
      @media (max-width: 640px) {
        .qualificationsSection { background-size: 100% 100%; }
        .researchSection { background-size: 100% 100%; }
      }
    `;

    expect(
      hasMobileBackgroundSizing(splitSelectorCss, [
        ".qualificationsSection",
        ".researchSection"
      ], "100% 100%")
    ).toBe(true);
  });

  it("keeps the established homepage section composition in order", () => {
    const homeSource = read("app/page.tsx");
    const positions = homepageSequence.map((name) =>
      homeSource.indexOf(`<${name}`)
    );

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(homeSource).toContain('<CTASection variant="home" />');
  });

  it("applies the approved shared gradient sequence to every homepage content section", () => {
    for (const assignment of gradientAssignments) {
      const source = read(assignment.component);
      const audit = auditSectionGradients(source, assignment.component);

      expect(audit.importsSharedModule, assignment.component).toBe(true);
      expect(
        audit.sections.get(assignment.rootStyle),
        `${assignment.component} styles.${assignment.rootStyle}`
      ).toContain(assignment.variant);
    }
  });

  it("leaves section backgrounds to the shared module without adding transition slabs", () => {
    const assignmentsByCss = new Map<string, GradientAssignment[]>();

    for (const assignment of gradientAssignments) {
      const assignments = assignmentsByCss.get(assignment.css) ?? [];
      assignments.push(assignment);
      assignmentsByCss.set(assignment.css, assignments);
    }

    for (const [cssPath, assignments] of assignmentsByCss) {
      const css = read(cssPath);

      for (const assignment of assignments) {
        const root = assignment.rootSelector;
        const declarations = declarationsForSelector(css, root);
        expect(declarations, `${cssPath} ${root}`).not.toContain(
          "background"
        );
        expect(declarations, `${cssPath} ${root}`).not.toContain(
          "background-color"
        );
        expect(declarations, `${cssPath} ${root}`).not.toContain(
          "background-image"
        );
      }

      if (cssPath.includes("HomeAudienceBand")) {
        expect(
          hasMobileBackgroundSizing(
            css,
            assignments.map((assignment) => assignment.rootSelector),
            "100% 100%"
          ),
          `${cssPath} should keep its full-band audience gradient`
        ).toBe(true);
      } else {
        expect(
          css,
          `${cssPath} should inherit the compact shared handoff instead of adding a mobile slab`
        ).not.toContain("background-size: 100% 96px");
      }
    }

    const sharedGradientCss = read(
      "components/common/SectionGradient.module.css"
    );
    expect(sharedGradientCss).toContain(
      "background-size: 100% var(--sb-handoff-height)"
    );

    const aiprCss = read("components/home/HomeAiprCapabilities.module.css");
    expect(aiprCss).not.toMatch(/\.section::before\s*\{/);
    expect(aiprCss).not.toMatch(
      /width:\s*min\(720px,\s*60vw\)|top:\s*-280px|radial-gradient\(/
    );

    const ctaCss = read("components/common/CTASection.module.css");
    expect(ctaCss).toMatch(
      /\.brandSurface:not\(\.fluentSurface\)[\s\S]*?background:\s*#355792;/
    );
  });

  it("restores the approved local homepage example without shared full-height gradients", () => {
    const scenarioSource = read("components/home/HomeScenarioStrip.tsx");
    const serviceSource = read("components/home/HomeServiceGrid.tsx");
    const processSource = read("components/home/HomeProcess.tsx");
    const scenarioCss = read("components/home/HomeScenarioStrip.module.css");
    const serviceCss = read("components/home/HomeServiceGrid.module.css");
    const processCss = read("components/home/HomeProcess.module.css");

    for (const source of [scenarioSource, serviceSource, processSource]) {
      expect(source).not.toContain("SectionGradient.module.css");
      expect(source).not.toContain("gradientStyles.");
    }

    expect(scenarioCss).toMatch(
      /\.section\s*\{[\s\S]*?background-color:\s*#f7faff;[\s\S]*?linear-gradient\(to bottom,\s*#fff 0,\s*#f7faff 48px\)/i
    );
    expect(scenarioCss).toMatch(
      /\.section::after\s*\{[\s\S]*?height:\s*clamp\(30px,\s*4vw,\s*44px\);[\s\S]*?linear-gradient\(180deg,\s*#f7faff 0%,\s*#f6f3ec 100%\)/i
    );
    expect(serviceCss).toMatch(/\.section\s*\{[\s\S]*?background:\s*#f6f3ec;/i);
    expect(serviceCss).toMatch(
      /\.section::after\s*\{[\s\S]*?height:\s*clamp\(30px,\s*4vw,\s*44px\);[\s\S]*?linear-gradient\(180deg,\s*#f6f3ec 0%,\s*#ffffff 100%\)/i
    );
    expect(serviceCss).toMatch(/\.container::after\s*\{/);
    expect(processCss).toMatch(/\.section\s*\{[\s\S]*?background:\s*#ffffff;/i);
  });

  it("uses a short blue-white wash where the white process and qualification sections meet", () => {
    const researchCss = read("components/home/HomeResearch.module.css");

    expect(researchCss).toMatch(
      /\.qualificationsSection::before\s*\{[^}]*height:\s*96px;[^}]*linear-gradient\(to bottom,\s*#fff 0,\s*#f7faff 46%,\s*#fff 100%\)/s
    );
    expect(researchCss).toMatch(
      /\.qualificationsContainer\s*\{[^}]*position:\s*relative;[^}]*z-index:\s*1;/s
    );
  });
});
