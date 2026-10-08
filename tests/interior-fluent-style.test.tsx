import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { ShieldCheck } from "lucide-react";
import { CTASection } from "../components/common/CTASection";
import HomePage from "../app/page";
import { FeatureCard } from "../components/common/FeatureCard";
import surfaceStyles from "../components/common/FluentSurface.module.css";
import { InteriorPageFrame } from "../components/common/InteriorPageFrame";
import { PageHero } from "../components/common/PageHero";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const materialProperties = [
  "background",
  "border",
  "border-radius",
  "box-shadow",
  "backdrop-filter",
  "-webkit-backdrop-filter"
] as const;

const surfaceVariants = ["standard", "data", "elevated"] as const;
type SurfaceVariant = (typeof surfaceVariants)[number];

type SurfaceAudit = {
  issues: string[];
  markerCount: number;
};

const task5RouteFiles = [
  "app/solutions/page.tsx",
  "app/services/page.tsx",
  "app/aipr/page.tsx",
  "app/trust/page.tsx",
  "app/compliance/page.tsx",
  "app/news/page.tsx",
  "app/news/[slug]/page.tsx",
  "app/about/page.tsx",
  "app/privacy/page.tsx",
  "app/disclaimer/page.tsx",
  "app/contact/page.tsx"
] as const;

const task5SurfaceSourceFiles = [
  ...task5RouteFiles,
  "components/common/FeatureCard.tsx",
  "components/common/PageHero.tsx",
  "components/common/CTASection.tsx",
  "components/contact/interactive-contact-shell.tsx"
] as const;

const interactionModifiers = new Set([
  "active",
  "focus",
  "focus-visible",
  "focus-within",
  "hover"
]);

function findJsxAttribute(
  node: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
  name: string
) {
  return node.attributes.properties.find(
    (property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) && property.name.getText() === name
  );
}

function surfaceAttributeVariants(attribute: ts.JsxAttribute) {
  const variants = new Set<SurfaceVariant>();
  const initializer = attribute.initializer;

  if (!initializer) {
    return variants;
  }

  const collect = (node: ts.Node) => {
    if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
      surfaceVariants.includes(node.text as SurfaceVariant)
    ) {
      variants.add(node.text as SurfaceVariant);
    }
    ts.forEachChild(node, collect);
  };

  collect(initializer);
  return variants;
}

function classNameFragments(attribute: ts.JsxAttribute) {
  const fragments: string[] = [];
  const initializer = attribute.initializer;

  if (!initializer) {
    return fragments;
  }

  const collect = (node: ts.Node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      node.kind === ts.SyntaxKind.TemplateHead ||
      node.kind === ts.SyntaxKind.TemplateMiddle ||
      node.kind === ts.SyntaxKind.TemplateTail
    ) {
      fragments.push((node as ts.LiteralLikeNode).text);
    }
    ts.forEachChild(node, collect);
  };

  collect(initializer);
  return fragments;
}

function staticTruthiness(expression: ts.Expression): boolean | undefined {
  if (ts.isParenthesizedExpression(expression)) {
    return staticTruthiness(expression.expression);
  }
  if (expression.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (
    expression.kind === ts.SyntaxKind.FalseKeyword ||
    expression.kind === ts.SyntaxKind.NullKeyword
  ) {
    return false;
  }
  if (ts.isIdentifier(expression) && expression.text === "undefined") {
    return false;
  }
  if (ts.isStringLiteralLike(expression)) {
    return expression.text.length > 0;
  }
  if (ts.isNumericLiteral(expression)) {
    return Number(expression.text) !== 0;
  }
  return undefined;
}

function staticNullishness(expression: ts.Expression): boolean | undefined {
  if (ts.isParenthesizedExpression(expression)) {
    return staticNullishness(expression.expression);
  }
  if (
    expression.kind === ts.SyntaxKind.NullKeyword ||
    (ts.isIdentifier(expression) && expression.text === "undefined")
  ) {
    return true;
  }
  if (
    expression.kind === ts.SyntaxKind.TrueKeyword ||
    expression.kind === ts.SyntaxKind.FalseKeyword ||
    ts.isStringLiteralLike(expression) ||
    ts.isNumericLiteral(expression) ||
    ts.isArrayLiteralExpression(expression) ||
    ts.isObjectLiteralExpression(expression)
  ) {
    return false;
  }
  return undefined;
}

function expressionCanApplySurfaceClass(
  expression: ts.Expression,
  variant: SurfaceVariant
): boolean {
  if (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === "surfaceStyles" &&
    expression.name.text === variant
  ) {
    return true;
  }

  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression) ||
    ts.isNonNullExpression(expression) ||
    ts.isSatisfiesExpression(expression)
  ) {
    return expressionCanApplySurfaceClass(expression.expression, variant);
  }

  if (ts.isTemplateExpression(expression)) {
    return expression.templateSpans.some((span) =>
      expressionCanApplySurfaceClass(span.expression, variant)
    );
  }

  if (ts.isArrayLiteralExpression(expression)) {
    return expression.elements.some((element) =>
      ts.isSpreadElement(element)
        ? expressionCanApplySurfaceClass(element.expression, variant)
        : expressionCanApplySurfaceClass(element, variant)
    );
  }

  if (ts.isConditionalExpression(expression)) {
    const condition = staticTruthiness(expression.condition);
    if (condition === true) {
      return expressionCanApplySurfaceClass(expression.whenTrue, variant);
    }
    if (condition === false) {
      return expressionCanApplySurfaceClass(expression.whenFalse, variant);
    }
    return (
      expressionCanApplySurfaceClass(expression.whenTrue, variant) ||
      expressionCanApplySurfaceClass(expression.whenFalse, variant)
    );
  }

  if (ts.isBinaryExpression(expression)) {
    if (expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      return (
        staticTruthiness(expression.left) !== false &&
        expressionCanApplySurfaceClass(expression.right, variant)
      );
    }
    if (expression.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
      const leftTruthiness = staticTruthiness(expression.left);
      if (leftTruthiness === true) {
        return expressionCanApplySurfaceClass(expression.left, variant);
      }
      if (leftTruthiness === false) {
        return expressionCanApplySurfaceClass(expression.right, variant);
      }
      return (
        expressionCanApplySurfaceClass(expression.left, variant) ||
        expressionCanApplySurfaceClass(expression.right, variant)
      );
    }
    if (expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
      const leftNullishness = staticNullishness(expression.left);
      if (leftNullishness === false) {
        return expressionCanApplySurfaceClass(expression.left, variant);
      }
      if (leftNullishness === true) {
        return expressionCanApplySurfaceClass(expression.right, variant);
      }
      return (
        expressionCanApplySurfaceClass(expression.left, variant) ||
        expressionCanApplySurfaceClass(expression.right, variant)
      );
    }
  }

  if (
    ts.isCallExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    (expression.expression.text === "cn" || expression.expression.text === "clsx")
  ) {
    return expression.arguments.some((argument) =>
      expressionCanApplySurfaceClass(argument, variant)
    );
  }

  return false;
}

function classNameAppliesSurfaceClass(
  attribute: ts.JsxAttribute,
  variant: SurfaceVariant
) {
  const initializer = attribute.initializer;
  return Boolean(
    initializer &&
      ts.isJsxExpression(initializer) &&
      initializer.expression &&
      expressionCanApplySurfaceClass(initializer.expression, variant)
  );
}

function forbiddenBaseMaterialUtility(token: string) {
  const segments = token.split(":");
  const utility = segments.at(-1) ?? token;
  const isInteractionOnly = segments
    .slice(0, -1)
    .some((modifier) => interactionModifiers.has(modifier));

  if (isInteractionOnly) {
    const isBorderColor =
      /^border-(?:transparent|current|inherit|black|white)(?:\/(?:\d+|\[[^\]]+\]))?$/.test(
        utility
      ) ||
      /^border-[a-z][a-z0-9-]*-(?:50|100|200|300|400|500|600|700|800|900|950)(?:\/(?:\d+|\[[^\]]+\]))?$/.test(
        utility
      ) ||
      /^border-\[(?:#|(?:rgba?|hsla?|oklch|oklab|lab|lch|color|var)\()[^\]]+\]$/.test(
        utility
      );
    const isShadow = /^shadow(?:-|$|\[)/.test(utility);
    const isControlledTranslate =
      utility === "-translate-y-[2px]" || utility === "translate-y-0";

    return !(isBorderColor || isShadow || isControlledTranslate);
  }

  return (
    /^bg(?:-|$|\[)/.test(utility) ||
    /^(?:from|via|to)(?:-|$|\[)/.test(utility) ||
    /^rounded(?:-|$)/.test(utility) ||
    /^border(?:-|$|\[)/.test(utility) ||
    /^shadow(?:-|$|\[)/.test(utility) ||
    /^backdrop(?:-|$|\[)/.test(utility)
  );
}

function auditSurfaceSource(source: string, path = "fixture.tsx"): SurfaceAudit {
  const sourceFile = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const issues: string[] = [];
  let markerCount = 0;
  let importsSharedSurfaceModule = false;

  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text.endsWith("FluentSurface.module.css") &&
      statement.importClause?.name?.text === "surfaceStyles"
    ) {
      importsSharedSurfaceModule = true;
    }
  }

  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const surfaceAttribute = findJsxAttribute(node, "data-fluent-surface");
      if (surfaceAttribute) {
        markerCount += 1;
        const location = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const label = `${path}:${location.line + 1} <${node.tagName.getText(sourceFile)}>`;
        const variants = surfaceAttributeVariants(surfaceAttribute);
        const classAttribute = findJsxAttribute(node, "className");

        if (variants.size === 0) {
          issues.push(`${label} has no statically auditable surface variant`);
        }
        if (!classAttribute) {
          issues.push(`${label} is missing className`);
        }
        for (const variant of variants) {
          if (!classAttribute || !classNameAppliesSurfaceClass(classAttribute, variant)) {
            issues.push(
              `${label} ${variant} marker is missing surfaceStyles.${variant} on the same JSX element`
            );
          }
        }

        if (classAttribute) {
          for (const token of classNameFragments(classAttribute).flatMap(
            (fragment) => fragment.split(/\s+/).filter(Boolean)
          )) {
            if (forbiddenBaseMaterialUtility(token)) {
              issues.push(`${label} owns forbidden base material utility ${token}`);
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  if (markerCount > 0 && !importsSharedSurfaceModule) {
    issues.push(`${path} must default-import surfaceStyles from FluentSurface.module.css`);
  }

  return { issues, markerCount };
}

function ruleBody(css: string, selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, "s"))?.[1] ?? "";
}

function expectNoBaseMaterial(css: string, selector: string) {
  const body = ruleBody(css, selector);
  expect(body, `${selector} must have a CSS rule`).not.toBe("");

  for (const property of materialProperties) {
    expect(body, `${selector} must not own ${property}`).not.toMatch(
      new RegExp(`(?:^|;)\\s*${property}\\s*:`)
    );
  }
}

describe("interior Fluent visual boundary", () => {
  it("rejects a shared surface class borrowed from a different JSX element", () => {
    const misplacedClassFixture = `
      import surfaceStyles from "./FluentSurface.module.css";
      export function Fixture() {
        return <><article data-fluent-surface="standard" className="p-6" /><aside className={surfaceStyles.standard} /></>;
      }
    `;

    expect(auditSurfaceSource(misplacedClassFixture).issues).toEqual([
      expect.stringContaining(
        "standard marker is missing surfaceStyles.standard on the same JSX element"
      )
    ]);
  });

  it("rejects textual and constant-false shared surface references", () => {
    const textualFixture = `
      import surfaceStyles from "./FluentSurface.module.css";
      export function Fixture() {
        return <article data-fluent-surface="standard" className="surfaceStyles.standard" />;
      }
    `;
    const constantFalseFixture = `
      import surfaceStyles from "./FluentSurface.module.css";
      export function Fixture() {
        return <article data-fluent-surface="standard" className={cn(false && surfaceStyles.standard, "p-6")} />;
      }
    `;

    for (const fixture of [textualFixture, constantFalseFixture]) {
      expect(auditSurfaceSource(fixture).issues).toContainEqual(
        expect.stringContaining(
          "standard marker is missing surfaceStyles.standard on the same JSX element"
        )
      );
    }
  });

  it("accepts reachable property access in templates and cn/clsx arrays", () => {
    const fixtures = [
      `
        import surfaceStyles from "./FluentSurface.module.css";
        export function Fixture() {
          return <article data-fluent-surface="standard" className={\`${"${surfaceStyles.standard}"} p-6\`} />;
        }
      `,
      `
        import surfaceStyles from "./FluentSurface.module.css";
        export function Fixture() {
          return <article data-fluent-surface="standard" className={cn(surfaceStyles.standard, "p-6")} />;
        }
      `,
      `
        import surfaceStyles from "./FluentSurface.module.css";
        export function Fixture() {
          return <article data-fluent-surface="standard" className={clsx([surfaceStyles.standard, "p-6"])} />;
        }
      `
    ];

    for (const fixture of fixtures) {
      expect(auditSurfaceSource(fixture).issues).toEqual([]);
    }
  });

  it("rejects base material utilities on the marked JSX element only", () => {
    const forbiddenUtilities = [
      "bg-white",
      "bg-white/80",
      "bg-[#edf3ff]",
      "rounded-2xl",
      "border",
      "border-white/80",
      "shadow-lg",
      "backdrop-blur-md"
    ];
    const fixture = `
      import surfaceStyles from "./FluentSurface.module.css";
      export function Fixture() {
        return <>
          <article data-fluent-surface="standard" className={\`${"${surfaceStyles.standard}"} ${forbiddenUtilities.join(" ")} hover:border-blue-500 hover:shadow-xl\`} />
          <article className="bg-white rounded-2xl border shadow-lg">Legal prose</article>
        </>;
      }
    `;
    const issues = auditSurfaceSource(fixture).issues;

    for (const utility of forbiddenUtilities) {
      expect(issues).toContainEqual(
        expect.stringContaining(`forbidden base material utility ${utility}`)
      );
    }
    expect(issues).not.toContainEqual(expect.stringContaining("hover:border-blue-500"));
    expect(issues).not.toContainEqual(expect.stringContaining("hover:shadow-xl"));
  });

  it("rejects material-changing interaction utilities on marked elements", () => {
    const backgroundUtilities = [
      "bg-slate-50",
      "bg-black",
      "bg-[rgb(1,2,3)]",
      "bg-gradient-to-r",
      "from-blue-100",
      "via-slate-50",
      "to-white",
      "backdrop-blur-md"
    ];
    const fixture = `
      import surfaceStyles from "./FluentSurface.module.css";
      export function Fixture() {
        return <>
          <article data-fluent-surface="standard" className={\`${"${surfaceStyles.standard}"} ${backgroundUtilities.join(" ")} hover:bg-black focus:from-blue-100 active:backdrop-blur hover:rounded\`} />
          <article className="bg-black bg-gradient-to-r from-blue-100 to-white">News prose</article>
        </>;
      }
    `;
    const issues = auditSurfaceSource(fixture).issues;

    for (const utility of backgroundUtilities) {
      expect(issues).toContainEqual(
        expect.stringContaining(`forbidden base material utility ${utility}`)
      );
    }
    for (const utility of [
      "hover:bg-black",
      "focus:from-blue-100",
      "active:backdrop-blur",
      "hover:rounded"
    ]) {
      expect(issues).toContainEqual(
        expect.stringContaining(`forbidden base material utility ${utility}`)
      );
    }
  });

  it("marks inner pages without leaking into the homepage", () => {
    const innerMarkup = renderToStaticMarkup(
      <InteriorPageFrame>
        <section>Inner page</section>
      </InteriorPageFrame>
    );
    const homeMarkup = renderToStaticMarkup(<HomePage />);

    expect(innerMarkup).toContain('data-interior-fluent="true"');
    expect(homeMarkup).not.toContain('data-interior-fluent="true"');
  });

  it("marks reusable business cards as standard Fluent surfaces", () => {
    const featureMarkup = renderToStaticMarkup(
      <InteriorPageFrame>
        <FeatureCard
          title="可信认证"
          description="形成清晰的权属记录。"
          icon={ShieldCheck}
        />
      </InteriorPageFrame>
    );

    expect(featureMarkup).toContain('data-fluent-surface="standard"');
    expect(featureMarkup).toContain(surfaceStyles.standard);
    expect(featureMarkup).toContain(surfaceStyles.icon);
    expect(read("components/common/FeatureCard.tsx")).toContain(
      'import surfaceStyles from "./FluentSurface.module.css"'
    );
  });

  it("keeps PageHero free of empty decorative surface placeholders", () => {
    const markup = renderToStaticMarkup(
      <PageHero eyebrow="Eyebrow" title="Title" description="Description" />
    );

    expect(markup).not.toContain("data-fluent-surface");
    expect(read("components/common/PageHero.tsx")).not.toContain(
      'import surfaceStyles from "./FluentSurface.module.css"'
    );
    expect(read("components/common/PageHero.tsx")).not.toContain("glassAccent");
  });

  it("uses the shared elevated surface for default CTAs but preserves the home CTA", () => {
    const defaultMarkup = renderToStaticMarkup(<CTASection />);
    const homeMarkup = renderToStaticMarkup(<CTASection variant="home" />);
    const ctaCss = read("components/common/CTASection.module.css");

    expect(defaultMarkup).toContain('data-fluent-surface="elevated"');
    expect(defaultMarkup).toContain(surfaceStyles.elevated);
    expect(homeMarkup).not.toContain("data-fluent-surface");
    expect(homeMarkup).not.toContain(surfaceStyles.elevated);
    expect(read("components/common/CTASection.tsx")).toContain(
      'import surfaceStyles from "./FluentSurface.module.css"'
    );
    expectNoBaseMaterial(ctaCss, ".fluentSurface");
    expect(ctaCss).not.toMatch(/\.fluentSurface::before\s*\{/);
  });

  it("uses the approved ambient frame without duplicating shared surface material", () => {
    const frameCss = read("components/common/InteriorPageFrame.module.css");
    const pageBody = ruleBody(frameCss, ".page");

    expect(pageBody).toMatch(/min-width:\s*0/);
    expect(pageBody).toMatch(/overflow-x:\s*clip/);
    expect(pageBody).toMatch(/background:\s*var\(--sb-white\)/);
    expect(pageBody).not.toMatch(/background:\s*linear-gradient\(/);
    expect(frameCss).not.toMatch(/\.page\s+\[data-fluent-surface/);
    expect(frameCss).not.toMatch(/border-radius:\s*24px/);
    expect(frameCss).not.toMatch(/border-radius:\s*18px/);
  });

  it("audits every Task 5 route and every marked surface at JSX-element scope", () => {
    const audits = task5SurfaceSourceFiles.map((path) => ({
      path,
      audit: auditSurfaceSource(read(path), path)
    }));
    const issues = audits.flatMap(({ audit }) => audit.issues);
    const markerCount = audits.reduce(
      (count, { audit }) => count + audit.markerCount,
      0
    );

    expect(new Set(task5RouteFiles).size).toBe(task5RouteFiles.length);
    for (const routePath of task5RouteFiles) {
      expect(task5SurfaceSourceFiles, routePath).toContain(routePath);
      expect(read(routePath), routePath).toContain("InteriorPageFrame");
    }
    expect(markerCount).toBeGreaterThan(0);
    expect(issues).toEqual([]);
  });

  it("removes opaque local card utilities and delegates business section backgrounds to the shared gradients", () => {
    const businessPages = [
      "app/solutions/page.tsx",
      "app/services/page.tsx",
      "app/aipr/page.tsx",
      "app/trust/page.tsx",
      "app/compliance/page.tsx",
      "app/news/page.tsx",
      "app/about/page.tsx"
    ];

    for (const path of businessPages) {
      const source = read(path);
      expect(source, path).not.toMatch(
        /<section className="bg-(?:white|\[#edf3ff\]|\[#f6f3ec\])\s+py-/
      );
      expect(source, path).not.toContain('<section className="bg-transparent py-');
      expect(source, path).toContain(
        'import { SectionBand } from "@/components/common/SectionBand";'
      );
      expect(source, path).toMatch(
        /<SectionBand tone="(?:blueToIvory|ivoryToWhite|blueToWhite)"/
      );
    }

    expect(read("app/globals.css")).toMatch(
      /\.privacy-policy\s*\{[^}]*background:\s*rgb\(255 255 255 \/ 88%\)/s
    );
    expect(read("app/news/[slug]/page.tsx")).toContain(
      "surfaceStyles.standard"
    );
    expect(read("app/disclaimer/page.tsx")).toContain(
      "surfaceStyles.standard"
    );
  });

  it("uses shared elevated material on every contact shell without changing panel behavior", () => {
    const pageSource = read("app/contact/page.tsx");
    const shellSource = read("components/contact/interactive-contact-shell.tsx");
    const globals = read("app/globals.css");

    expect(pageSource).toContain("surfaceStyles.elevated");
    expect(pageSource.match(/surfaceStyles\.elevated/g)).toHaveLength(2);
    expect(shellSource).toContain("surfaceStyles.elevated");
    expect(shellSource).toContain('className={`contact-interactive-shell ${surfaceStyles.elevated}`}');
    expectNoBaseMaterial(globals, ".contact-interactive-shell");
    expectNoBaseMaterial(globals, ".contact-interactive-shell--loading");
    expect(shellSource).toContain("onSubmit={onSubmit}");
    expect(shellSource).toContain("onPointerMove={onPointerMove}");
  });

  it("scopes every non-home content route while leaving the homepage untouched", () => {
    for (const pagePath of task5RouteFiles) {
      expect(read(pagePath), pagePath).toContain("InteriorPageFrame");
    }

    expect(read("app/page.tsx")).not.toContain("InteriorPageFrame");
  });
});
