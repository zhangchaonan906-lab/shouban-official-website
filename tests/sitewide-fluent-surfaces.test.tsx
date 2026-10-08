// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, within } from "@testing-library/react";
import {
  parse,
  type AtRule,
  type Declaration,
  type Root,
  type Rule
} from "postcss";
import { afterEach, describe, expect, it, vi } from "vitest";
import surfaceStyles from "@/components/common/FluentSurface.module.css";
import { HomeAiprCapabilities } from "@/components/home/HomeAiprCapabilities";
import { HomePositioning } from "@/components/home/HomePositioning";
import { HomeProcess } from "@/components/home/HomeProcess";
import { HomeResearch } from "@/components/home/HomeResearch";
import researchStyles from "@/components/home/HomeResearch.module.css";
import { HomeScenarioStrip } from "@/components/home/HomeScenarioStrip";
import { HomeServiceGrid } from "@/components/home/HomeServiceGrid";

const cssPath = join(
  process.cwd(),
  "components",
  "common",
  "FluentSurface.module.css"
);
const source = readFileSync(cssPath, "utf8");
const root = parse(source, { from: cssPath });
const positioningCssPath = join(
  process.cwd(),
  "components",
  "home",
  "HomePositioning.module.css"
);
const positioningSource = readFileSync(positioningCssPath, "utf8");
const positioningRoot = parse(positioningSource, { from: positioningCssPath });
const aiprCssPath = join(
  process.cwd(),
  "components",
  "home",
  "HomeAiprCapabilities.module.css"
);
const aiprSource = readFileSync(aiprCssPath, "utf8");
const aiprRoot = parse(aiprSource, { from: aiprCssPath });
const aiprComponentPath = join(
  process.cwd(),
  "components",
  "home",
  "HomeAiprCapabilities.tsx"
);
const aiprComponentSource = readFileSync(aiprComponentPath, "utf8");
const sectionGradientCssPath = join(
  process.cwd(),
  "components",
  "common",
  "SectionGradient.module.css"
);
const sectionGradientSource = readFileSync(sectionGradientCssPath, "utf8");
const sectionGradientRoot = parse(sectionGradientSource, {
  from: sectionGradientCssPath
});
const serviceGridCssPath = join(
  process.cwd(),
  "components",
  "home",
  "HomeServiceGrid.module.css"
);
const serviceGridSource = readFileSync(serviceGridCssPath, "utf8");
const serviceGridRoot = parse(serviceGridSource, { from: serviceGridCssPath });
const processCssPath = join(
  process.cwd(),
  "components",
  "home",
  "HomeProcess.module.css"
);
const processSource = readFileSync(processCssPath, "utf8");
const processRoot = parse(processSource, { from: processCssPath });
const scenarioCssPath = join(
  process.cwd(),
  "components",
  "home",
  "HomeScenarioStrip.module.css"
);
const scenarioSource = readFileSync(scenarioCssPath, "utf8");
const scenarioRoot = parse(scenarioSource, { from: scenarioCssPath });
const researchCssPath = join(
  process.cwd(),
  "components",
  "home",
  "HomeResearch.module.css"
);
const researchSource = readFileSync(researchCssPath, "utf8");
const researchRoot = parse(researchSource, { from: researchCssPath });
const qualificationCssPath = join(
  process.cwd(),
  "components",
  "home",
  "QualificationCarousel.module.css"
);
const qualificationSource = readFileSync(qualificationCssPath, "utf8");
const qualificationRoot = parse(qualificationSource, {
  from: qualificationCssPath
});

const allVariants = [
  ".standard",
  ".data",
  ".elevated",
  ".media",
  ".control",
  ".icon"
] as const;
const motionVariants = [
  ".standard",
  ".data",
  ".elevated",
  ".media",
  ".control"
] as const;

afterEach(() => {
  vi.unstubAllGlobals();
});

type CssScope = Root | AtRule;

function directRules(scope: CssScope) {
  return (scope.nodes ?? []).filter((node): node is Rule => node.type === "rule");
}

function selectorSet(rule: Rule) {
  return new Set(rule.selectors.map((selector) => selector.trim()));
}

function sameSelectorSet(rule: Rule, expected: readonly string[]) {
  const actual = selectorSet(rule);
  return (
    actual.size === expected.length &&
    expected.every((selector) => actual.has(selector))
  );
}

function getUniqueRule(scope: CssScope, selectors: readonly string[]) {
  const matches = directRules(scope).filter((rule) =>
    sameSelectorSet(rule, selectors)
  );

  expect(matches, `expected one rule for ${selectors.join(", ")}`).toHaveLength(1);
  return matches[0];
}

function getUniqueAtRule(rootNode: Root, name: string, params: string) {
  const matches = (rootNode.nodes ?? []).filter(
    (node): node is AtRule =>
      node.type === "atrule" &&
      node.name === name &&
      node.params.trim() === params
  );

  expect(matches, `expected one @${name} ${params}`).toHaveLength(1);
  return matches[0];
}

function directDeclarations(rule: Rule, property: string) {
  return rule.nodes.filter(
    (node): node is Declaration =>
      node.type === "decl" && node.prop.toLowerCase() === property.toLowerCase()
  );
}

function declarationsFor(
  scope: CssScope,
  selector: string,
  property: string
) {
  return directRules(scope).flatMap((rule) =>
    selectorSet(rule).has(selector) ? directDeclarations(rule, property) : []
  );
}

function dividerDeclarations(rootNode: Root, selectors: readonly string[]) {
  const declarations: Declaration[] = [];

  rootNode.walkRules((rule) => {
    const targetsSelector = rule.selectors.some((ruleSelector) =>
      selectors.some(
        (selector) =>
          ruleSelector.trim() === selector ||
          ruleSelector.trim().startsWith(`${selector}:`)
      )
    );

    if (!targetsSelector) {
      return;
    }

    rule.walkDecls((declaration) => {
      const property = declaration.prop.toLowerCase();

      if (
        property === "border" ||
        /^border-(?:top|right|bottom|left|block|inline)/.test(property)
      ) {
        declarations.push(declaration);
      }
    });
  });

  return declarations;
}

const materialProperties =
  /^(?:background(?:-.+)?|border(?:$|-.+)|box-shadow|filter|-webkit-backdrop-filter|backdrop-filter)$/;

function selectorTargetsClass(selector: string, className: string) {
  const lastCompound = selector
    .trim()
    .split(/[\s>+~]+/)
    .filter(Boolean)
    .at(-1);

  return new RegExp(`\\.${className}(?![\\w-])`).test(lastCompound ?? "");
}

function localMaterialOverrides(rootNode: Root, classNames: readonly string[]) {
  const overrides: Declaration[] = [];

  rootNode.walkRules((rule) => {
    const relevantSelectors = rule.selectors.filter((selector) =>
      classNames.some((className) => selectorTargetsClass(selector, className))
    );

    if (relevantSelectors.length === 0) {
      return;
    }

    const isInteractionRule = relevantSelectors.every((selector) =>
      /:(?:hover|focus-visible|active)/.test(selector)
    );

    rule.walkDecls((declaration) => {
      const property = declaration.prop.toLowerCase();
      const isAllowedInteractionBorder =
        isInteractionRule && property === "border-color";
      const isAllowedInteractionShadow =
        isInteractionRule &&
        property === "box-shadow" &&
        /\binset\b/.test(declaration.value);

      if (
        materialProperties.test(property) &&
        !isAllowedInteractionBorder &&
        !isAllowedInteractionShadow
      ) {
        overrides.push(declaration);
      }
    });
  });

  return overrides;
}

function describeDeclarations(declarations: readonly Declaration[]) {
  return declarations.map(
    (declaration) =>
      `${(declaration.parent as Rule).selector}: ${declaration.prop}: ${declaration.value}`
  );
}

function lastEffectiveDeclaration(
  scope: CssScope,
  selector: string,
  property: string
) {
  const declarations = declarationsFor(scope, selector, property);
  const importantDeclarations = declarations.filter(
    (declaration) => declaration.important
  );
  const candidates = importantDeclarations.length
    ? importantDeclarations
    : declarations;

  expect(
    candidates,
    `missing ${property} for ${selector}`
  ).not.toHaveLength(0);
  return candidates[candidates.length - 1];
}

function normalizeValue(value: string) {
  return value.trim().split(/\s+/).join(" ");
}

function expectLastRuleDeclaration(
  rule: Rule,
  property: string,
  value: string,
  important = false
) {
  const declarations = directDeclarations(rule, property);
  expect(
    declarations,
    `missing ${property} in ${rule.selector}`
  ).not.toHaveLength(0);

  const declaration = declarations[declarations.length - 1];
  expect(normalizeValue(declaration.value)).toBe(normalizeValue(value));
  expect(Boolean(declaration.important)).toBe(important);
}

function expectEffectiveDeclaration(
  scope: CssScope,
  selectors: readonly string[],
  property: string,
  value: string,
  important = false
) {
  for (const selector of selectors) {
    const declaration = lastEffectiveDeclaration(scope, selector, property);
    expect(normalizeValue(declaration.value), `${property} for ${selector}`).toBe(
      normalizeValue(value)
    );
    expect(
      Boolean(declaration.important),
      `${property} importance for ${selector}`
    ).toBe(important);
  }
}

describe("shared Fluent surface material contract", () => {
  it("applies the complete desktop glass material to all six variants", () => {
    const sharedRule = getUniqueRule(root, allVariants);
    const shadow = "var(--sb-shadow-standard)";

    expectLastRuleDeclaration(
      sharedRule,
      "border",
      "1px solid var(--sb-border-glass)"
    );
    expectLastRuleDeclaration(sharedRule, "box-shadow", shadow);
    expectLastRuleDeclaration(
      sharedRule,
      "-webkit-backdrop-filter",
      "blur(20px) saturate(120%)"
    );
    expectLastRuleDeclaration(
      sharedRule,
      "backdrop-filter",
      "blur(20px) saturate(120%)"
    );

    expectEffectiveDeclaration(
      root,
      allVariants,
      "border",
      "1px solid var(--sb-border-glass)"
    );
    expectEffectiveDeclaration(
      root,
      allVariants,
      "-webkit-backdrop-filter",
      "blur(20px) saturate(120%)"
    );
    expectEffectiveDeclaration(
      root,
      allVariants,
      "backdrop-filter",
      "blur(20px) saturate(120%)"
    );
    expectEffectiveDeclaration(
      root,
      [".standard", ".data", ".control", ".icon"],
      "box-shadow",
      shadow
    );

    for (const selector of allVariants) {
      expect(declarationsFor(root, selector, "transition")).toHaveLength(0);
    }
  });

  it.each([
    ["standard", ".standard", "var(--sb-panel-radius)", "rgba(255, 255, 255, 0.68)"],
    ["data", ".data", "var(--sb-panel-radius)", "rgba(237, 243, 255, 0.62)"],
    ["elevated", ".elevated", "var(--sb-panel-radius-elevated)", "rgba(255, 255, 255, 0.74)"],
    ["media", ".media", "var(--sb-panel-radius-elevated)", "rgba(255, 255, 255, 0.2)"],
    ["control", ".control", "var(--sb-control-radius)", "rgba(255, 255, 255, 0.72)"],
    ["icon", ".icon", "var(--sb-icon-radius)", "rgba(237, 243, 255, 0.78)"]
  ])(
    "defines the exact %s radius and background",
    (_name, selector, radius, background) => {
      const rule = getUniqueRule(root, [selector]);

      expectLastRuleDeclaration(rule, "border-radius", radius);
      expectLastRuleDeclaration(rule, "background", background);
      expectEffectiveDeclaration(root, [selector], "border-radius", radius);
      expectEffectiveDeclaration(root, [selector], "background", background);
    }
  );

  it("gives elevated and media variants distinct highlighted blue shadows", () => {
    const elevated = getUniqueRule(root, [".elevated"]);
    const media = getUniqueRule(root, [".media"]);
    const elevatedShadow = "var(--sb-shadow-elevated)";
    const mediaShadow = "var(--sb-shadow-media)";

    expectLastRuleDeclaration(elevated, "box-shadow", elevatedShadow);
    expectLastRuleDeclaration(media, "box-shadow", mediaShadow);
    expectEffectiveDeclaration(root, [".elevated"], "box-shadow", elevatedShadow);
    expectEffectiveDeclaration(root, [".media"], "box-shadow", mediaShadow);
  });

  it("groups solid white and light-blue fallbacks by variant", () => {
    const fallback = getUniqueAtRule(
      root,
      "supports",
      "not ((backdrop-filter: blur(20px)) or (-webkit-backdrop-filter: blur(20px)))"
    );
    const whiteSelectors = [".standard", ".elevated", ".control"];
    const blueSelectors = [".data", ".media", ".icon"];
    const whiteFallback = getUniqueRule(fallback, whiteSelectors);
    const blueFallback = getUniqueRule(fallback, blueSelectors);

    expectLastRuleDeclaration(whiteFallback, "background", "#ffffff");
    expectLastRuleDeclaration(blueFallback, "background", "#edf3ff");
    expectEffectiveDeclaration(
      fallback,
      whiteSelectors,
      "background",
      "#ffffff"
    );
    expectEffectiveDeclaration(
      fallback,
      blueSelectors,
      "background",
      "#edf3ff"
    );
  });

  it("reduces radii, filters, and every effective shadow on mobile", () => {
    const mobile = getUniqueAtRule(root, "media", "(max-width: 809px)");
    const mainSelectors = [".standard", ".data", ".elevated", ".media"];
    const elevatedMediaSelectors = [".elevated", ".media"];
    const mainSurfaces = getUniqueRule(mobile, mainSelectors);
    const mobileMaterial = getUniqueRule(mobile, allVariants);
    const mobileElevatedMedia = getUniqueRule(mobile, elevatedMediaSelectors);
    const mobileShadow = "var(--sb-shadow-mobile)";
    const elevatedMediaShadow = "var(--sb-shadow-mobile-elevated)";

    expectLastRuleDeclaration(
      mainSurfaces,
      "border-radius",
      "var(--sb-panel-radius-mobile)"
    );
    expectLastRuleDeclaration(
      mobileMaterial,
      "-webkit-backdrop-filter",
      "blur(15px) saturate(120%)"
    );
    expectLastRuleDeclaration(
      mobileMaterial,
      "backdrop-filter",
      "blur(15px) saturate(120%)"
    );
    expectLastRuleDeclaration(mobileMaterial, "box-shadow", mobileShadow);
    expectLastRuleDeclaration(
      mobileElevatedMedia,
      "box-shadow",
      elevatedMediaShadow
    );

    expectEffectiveDeclaration(
      mobile,
      mainSelectors,
      "border-radius",
      "var(--sb-panel-radius-mobile)"
    );
    expectEffectiveDeclaration(
      mobile,
      allVariants,
      "-webkit-backdrop-filter",
      "blur(15px) saturate(120%)"
    );
    expectEffectiveDeclaration(
      mobile,
      allVariants,
      "backdrop-filter",
      "blur(15px) saturate(120%)"
    );
    expectEffectiveDeclaration(
      mobile,
      [".standard", ".data", ".control", ".icon"],
      "box-shadow",
      mobileShadow
    );
    expectEffectiveDeclaration(
      mobile,
      elevatedMediaSelectors,
      "box-shadow",
      elevatedMediaShadow
    );
  });

  it("uses important reduced-motion overrides without resetting icon transforms", () => {
    const reducedMotion = getUniqueAtRule(
      root,
      "media",
      "(prefers-reduced-motion: reduce)"
    );
    const transitionRule = getUniqueRule(reducedMotion, allVariants);
    const transformRule = getUniqueRule(reducedMotion, motionVariants);

    expectLastRuleDeclaration(transitionRule, "transition", "none", true);
    expectLastRuleDeclaration(transformRule, "transform", "none", true);
    expectEffectiveDeclaration(
      reducedMotion,
      allVariants,
      "transition",
      "none",
      true
    );
    expectEffectiveDeclaration(
      reducedMotion,
      motionVariants,
      "transform",
      "none",
      true
    );
    expect(declarationsFor(reducedMotion, ".icon", "transform")).toHaveLength(0);
  });
});

describe("homepage Fluent surface adoption", () => {
  it("spaces positioning surfaces without local divider borders", () => {
    const scenarioList = getUniqueRule(positioningRoot, [".scenarioList"]);

    expectLastRuleDeclaration(scenarioList, "gap", "16px");
    expect(
      dividerDeclarations(positioningRoot, [".scenarioList", ".scenarioItem"])
    ).toHaveLength(0);
  });

  it("spaces AIPR surfaces without local divider borders", () => {
    const capabilityList = getUniqueRule(aiprRoot, [".capabilityList"]);

    expectLastRuleDeclaration(capabilityList, "gap", "14px");
    expect(
      dividerDeclarations(aiprRoot, [".capabilityList", ".capabilityItem"])
    ).toHaveLength(0);
  });

  it("uses the approved shared warm-to-white AIPR gradient", () => {
    const section = getUniqueRule(aiprRoot, [".section"]);
    const sharedVariant = getUniqueRule(sectionGradientRoot, [
      ".ivoryToWhite"
    ]);
    const background = directDeclarations(
      sharedVariant,
      "background-image"
    ).at(-1);

    expect(aiprComponentSource).toContain("gradientStyles.ivoryToWhite");
    expect(background).toBeDefined();
    expect(normalizeValue(background!.value)).toBe(
      "linear-gradient(180deg, var(--sb-ivory) 0%, var(--sb-air) 58%, var(--sb-white) 100%)"
    );
    expect(directDeclarations(section, "background")).toHaveLength(0);
    expect(directDeclarations(section, "background-color")).toHaveLength(0);
    expect(directDeclarations(section, "background-image")).toHaveLength(0);
    expect(aiprSource).not.toContain(".section::after");
  });

  it("gives the AIPR CTA a solid accessible focus outline", () => {
    const focusRule = getUniqueRule(aiprRoot, [".link:focus-visible"]);

    expectLastRuleDeclaration(focusRule, "outline", "3px solid #3347b8");
    expectLastRuleDeclaration(focusRule, "outline-offset", "5px");
  });

  it("leaves service-link and icon material to the shared surface classes", () => {
    const serviceList = getUniqueRule(serviceGridRoot, [".serviceList"]);
    const hoverRule = getUniqueRule(serviceGridRoot, [".serviceLink:hover"]);
    const localMaterialProperties =
      /^(?:background(?:-.+)?|border(?:-.+)?|box-shadow|-webkit-backdrop-filter|backdrop-filter)$/;
    const allowedInteractionProperties = new Set([
      "border-color",
      "box-shadow"
    ]);
    const localMaterialDeclarations: Declaration[] = [];

    expectLastRuleDeclaration(serviceList, "gap", "16px");
    expectLastRuleDeclaration(
      hoverRule,
      "border-color",
      "rgb(51 71 184 / 42%)"
    );
    expectLastRuleDeclaration(
      hoverRule,
      "box-shadow",
      "inset 0 1px 0 rgb(255 255 255 / 88%), 0 16px 36px rgb(51 71 184 / 18%)"
    );

    serviceGridRoot.walkRules((rule) => {
      const ownsServiceOrIcon = rule.selectors.some(
        (selector) =>
          selector.includes(".serviceLink") || selector.includes(".iconFrame")
      );
      const isInteractionRule = rule.selectors.every((selector) =>
        /:(?:hover|focus-visible)/.test(selector)
      );

      if (!ownsServiceOrIcon) {
        return;
      }

      rule.walkDecls((declaration) => {
        const property = declaration.prop.toLowerCase();
        const isAllowedInteractionDeclaration =
          isInteractionRule && allowedInteractionProperties.has(property);

        if (
          localMaterialProperties.test(property) &&
          !isAllowedInteractionDeclaration
        ) {
          localMaterialDeclarations.push(declaration);
        }
      });
    });

    expect(
      localMaterialDeclarations.map(
        (declaration) => `${declaration.parent?.toString()}: ${declaration.prop}`
      )
    ).toEqual([]);
  });

  it("replaces the process slab and connectors with spaced data cards", () => {
    const processList = getUniqueRule(processRoot, [".processList"]);
    const processItem = getUniqueRule(processRoot, [".processItem"]);
    const stepNode = getUniqueRule(processRoot, [".stepNode"]);
    const mobile = getUniqueAtRule(processRoot, "media", "(max-width: 719px)");
    const mobileList = getUniqueRule(mobile, [".processList"]);

    expectLastRuleDeclaration(processList, "gap", "16px");
    expectLastRuleDeclaration(processList, "border", "0");
    expectLastRuleDeclaration(processList, "border-radius", "0");
    expectLastRuleDeclaration(processList, "padding", "0");
    expectLastRuleDeclaration(processList, "background", "transparent");
    expectLastRuleDeclaration(processItem, "padding", "24px");
    expectLastRuleDeclaration(stepNode, "border-radius", "14px");
    expectLastRuleDeclaration(
      stepNode,
      "background",
      "rgba(255, 255, 255, 0.72)"
    );
    expectLastRuleDeclaration(stepNode, "box-shadow", "none");
    expectLastRuleDeclaration(
      mobileList,
      "grid-template-columns",
      "minmax(0, 1fr)"
    );
    expectLastRuleDeclaration(mobileList, "gap", "14px");
    expect(
      processSource.includes(".processList::before")
    ).toBe(false);
    expect(
      processSource.includes(".processItem:not(:last-child)::after")
    ).toBe(false);
  });

  it("renders every positioning scenario as an independent standard surface", () => {
    const { container } = render(<HomePositioning />);
    const section = container.querySelector<HTMLElement>(
      '[data-positioning-layout="editorial"]'
    );

    expect(section).not.toBeNull();
    expect(surfaceStyles.standard).toBeTruthy();

    const scenarios = within(section!).getAllByRole("listitem");

    expect(scenarios).toHaveLength(4);
    scenarios.forEach((scenario) => {
      expect(scenario.getAttribute("data-fluent-surface")).toBe("standard");
      expect(scenario.classList.contains(surfaceStyles.standard)).toBe(true);
    });
  });

  it("renders every AIPR capability as an independent data surface", () => {
    const { container } = render(<HomeAiprCapabilities />);
    const section = container.querySelector<HTMLElement>(
      '[data-aipr-tone="warm-light"]'
    );

    expect(section).not.toBeNull();
    expect(surfaceStyles.data).toBeTruthy();

    const capabilities = within(section!).getAllByRole("listitem");

    expect(capabilities).toHaveLength(5);
    capabilities.forEach((capability) => {
      expect(capability.getAttribute("data-fluent-surface")).toBe("data");
      expect(capability.classList.contains(surfaceStyles.data)).toBe(true);
    });
  });

  it("assigns shared service and icon classes that own backgrounds, fallbacks, and mobile radii", () => {
    const { container } = render(<HomeServiceGrid />);
    const entries = Array.from(
      container.querySelectorAll<HTMLElement>("[data-service-entry]")
    );
    const links = entries.flatMap((entry) =>
      Array.from(
        entry.querySelectorAll<HTMLAnchorElement>("a[data-fluent-surface]")
      )
    );

    expect(entries).toHaveLength(6);
    expect(links).toHaveLength(6);
    expect(links.map((link) => link.dataset.fluentSurface)).toEqual([
      "standard",
      "standard",
      "data",
      "data",
      "data",
      "data"
    ]);

    links.forEach((link, index) => {
      const sharedClass = index < 2 ? surfaceStyles.standard : surfaceStyles.data;
      const iconFrame = link.querySelector("svg[data-service-icon]")?.parentElement;

      expect(link.classList.contains(sharedClass)).toBe(true);
      expect(iconFrame?.classList.contains(surfaceStyles.icon)).toBe(true);
    });
  });

  it("renders every process step as a keyed data surface", () => {
    const { container } = render(<HomeProcess />);
    const steps = Array.from(
      container.querySelectorAll<HTMLElement>("li[data-process-step]")
    );

    expect(surfaceStyles.data).toBeTruthy();
    expect(steps).toHaveLength(4);
    expect(steps.map((step) => step.dataset.processStep)).toEqual([
      "01",
      "02",
      "03",
      "04"
    ]);
    steps.forEach((step) => {
      expect(step.dataset.fluentSurface).toBe("data");
      expect(step.classList.contains(surfaceStyles.data)).toBe(true);
    });
  });

  it("renders exactly five elevated glass text articles and two Fluent controls", () => {
    const { container } = render(<HomeScenarioStrip />);
    const scenarioSurfaces = Array.from(
      container.querySelectorAll<HTMLElement>(
        '[data-fluent-surface="elevated"]'
      )
    );
    const controls = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        'button[data-fluent-surface="control"]'
      )
    );

    expect(surfaceStyles.elevated).toBeTruthy();
    expect(surfaceStyles.control).toBeTruthy();
    expect(scenarioSurfaces).toHaveLength(5);
    expect(
      scenarioSurfaces.every(
        (surface) =>
          surface.tagName === "ARTICLE" &&
          surface.classList.contains(surfaceStyles.elevated)
      )
    ).toBe(true);
    expect(
      container.getElementsByClassName(surfaceStyles.elevated)
    ).toHaveLength(5);
    expect(controls).toHaveLength(2);
    expect(
      controls.every((control) =>
        control.classList.contains(surfaceStyles.control)
      )
    ).toBe(true);
    expect(
      container.getElementsByClassName(surfaceStyles.control)
    ).toHaveLength(2);
    expect(
      scenarioSurfaces.every(
        (surface) => surface.querySelectorAll("img").length === 0
      )
    ).toBe(true);
    expect(
      scenarioSurfaces.every(
        (surface) =>
          surface.querySelectorAll("[data-scenario-tag]").length === 2
      )
    ).toBe(true);
  });

  it("renders the qualification carrier and all six research entries as Fluent surfaces", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
    );
    const { container } = render(<HomeResearch />);
    const carousel = container.querySelector<HTMLElement>(
      '[data-qualification-carousel="true"]'
    );
    const researchEntries = Array.from(
      container.querySelectorAll<HTMLAnchorElement>("a[data-research-entry]")
    );

    expect(carousel).not.toBeNull();
    expect(carousel?.dataset.fluentSurface).toBe("elevated");
    expect(carousel?.classList.contains(surfaceStyles.elevated)).toBe(true);
    expect(researchEntries).toHaveLength(6);
    expect(
      researchEntries.filter((entry) =>
        entry.classList.contains(researchStyles.complianceLink)
      )
    ).toHaveLength(3);
    expect(
      researchEntries.filter((entry) =>
        entry.classList.contains(researchStyles.featuredResearch)
      )
    ).toHaveLength(1);
    expect(
      researchEntries.filter((entry) =>
        entry.classList.contains(researchStyles.secondaryResearchLink)
      )
    ).toHaveLength(2);
    researchEntries.forEach((entry) => {
      expect(entry.dataset.fluentSurface).toBe("standard");
      expect(entry.classList.contains(surfaceStyles.standard)).toBe(true);
    });
  });

  it("keeps scenario glass cards shadow-free while controls use shared material", () => {
    expect(
      describeDeclarations(
        localMaterialOverrides(scenarioRoot, ["card"])
      )
    ).toEqual([
      '.card[data-fluent-surface="elevated"]: box-shadow: none'
    ]);
    expect(
      describeDeclarations(
        localMaterialOverrides(scenarioRoot, ["control"])
      )
    ).toEqual([]);
    expect(scenarioSource).not.toContain(".cardImage");
    expect(scenarioSource).not.toContain(".cardShade");
    expect(scenarioSource).not.toContain(".srOnly");
    expect(scenarioSource).not.toContain(".glassWash");
    expect(scenarioSource).not.toContain("radial-gradient");
  });

  it("spaces research surfaces instead of drawing local dividers or materials", () => {
    const lists = getUniqueRule(researchRoot, [
      ".complianceList",
      ".secondaryResearchList"
    ]);
    const complianceLink = getUniqueRule(researchRoot, [".complianceLink"]);
    const featuredResearch = getUniqueRule(researchRoot, [
      ".featuredResearch"
    ]);
    const secondaryResearchLink = getUniqueRule(researchRoot, [
      ".secondaryResearchLink"
    ]);

    expectLastRuleDeclaration(lists, "gap", "14px");
    expectLastRuleDeclaration(lists, "margin-top", "16px");
    expectLastRuleDeclaration(complianceLink, "padding", "22px 24px");
    expectLastRuleDeclaration(featuredResearch, "padding", "22px 24px");
    expectLastRuleDeclaration(featuredResearch, "margin-top", "16px");
    expectLastRuleDeclaration(
      secondaryResearchLink,
      "padding",
      "22px 24px"
    );
    expect(
      describeDeclarations(
        localMaterialOverrides(researchRoot, [
          "complianceLink",
          "featuredResearch",
          "secondaryResearchLink"
        ])
      )
    ).toEqual([]);
  });

  it("keeps the elevated qualification carrier layout-only", () => {
    const carousel = getUniqueRule(qualificationRoot, [".carousel"]);

    expectLastRuleDeclaration(
      carousel,
      "padding",
      "clamp(18px, 2.5vw, 32px)"
    );
    expect(
      describeDeclarations(
        localMaterialOverrides(qualificationRoot, ["carousel"])
      )
    ).toEqual([]);
  });
});
