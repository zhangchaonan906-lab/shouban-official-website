import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  parse,
  type AtRule,
  type Declaration,
  type Root,
  type Rule
} from "postcss";
import { describe, expect, it } from "vitest";

const cssPath = resolve(
  process.cwd(),
  "components/home/QualificationCarousel.module.css"
);
const root = parse(readFileSync(cssPath, "utf8"), { from: cssPath });

type CssScope = Root | AtRule;

function getRule(scope: CssScope, selector: string) {
  const matches = (scope.nodes ?? []).filter(
    (node): node is Rule =>
      node.type === "rule" && node.selector.trim() === selector
  );

  expect(matches, `expected one ${selector} rule`).toHaveLength(1);
  return matches[0];
}

function getRuleBySelectors(scope: CssScope, selectors: readonly string[]) {
  const expected = new Set(selectors);
  const matches = (scope.nodes ?? []).filter((node): node is Rule => {
    if (node.type !== "rule") {
      return false;
    }

    const actual = new Set(
      node.selectors.map((selector) => selector.trim())
    );

    return (
      actual.size === expected.size &&
      selectors.every((selector) => actual.has(selector))
    );
  });

  expect(
    matches,
    `expected one rule for ${selectors.join(", ")}`
  ).toHaveLength(1);
  return matches[0];
}

function getAtRule(name: string, params: string) {
  const matches = (root.nodes ?? []).filter(
    (node): node is AtRule =>
      node.type === "atrule" &&
      node.name === name &&
      node.params.trim() === params
  );

  expect(matches, `expected one @${name} ${params}`).toHaveLength(1);
  return matches[0];
}

function getDeclaration(rule: Rule, property: string) {
  const matches = rule.nodes.filter(
    (node): node is Declaration =>
      node.type === "decl" && node.prop.toLowerCase() === property.toLowerCase()
  );

  expect(
    matches,
    `expected one ${property} declaration in ${rule.selector}`
  ).toHaveLength(1);
  return matches[0];
}

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

describe("qualification certificate frame", () => {
  it("uses a scoped non-interactive precision double-line frame", () => {
    const frame = getRule(root, ".paper::before");
    const mobileFrame = getRule(
      getAtRule("media", "(max-width: 640px)"),
      ".paper::before"
    );

    expect(getDeclaration(frame, "inset").value).toBe("5px");
    expect(normalize(getDeclaration(frame, "border").value)).toBe(
      "1px solid rgb(51 71 184 / 20%)"
    );
    expect(getDeclaration(frame, "pointer-events").value).toBe("none");
    expect(getDeclaration(mobileFrame, "inset").value).toBe("4px");
  });

  it("strengthens only the certificate border and inset-preserving shadow on hover-capable devices", () => {
    const paper = getRule(root, ".paper");
    const hoverPaper = getRule(
      getAtRule("media", "(hover: hover)"),
      ".card:hover .paper"
    );

    expect(normalize(getDeclaration(paper, "transition").value)).toBe(
      "border-color 220ms ease, box-shadow 220ms ease"
    );
    expect(normalize(getDeclaration(hoverPaper, "border-color").value)).toBe(
      "rgb(51 71 184 / 34%)"
    );
    expect(normalize(getDeclaration(hoverPaper, "box-shadow").value)).toBe(
      "0 1px 0 rgb(255 255 255 / 92%) inset, 0 34px 84px rgb(11 19 43 / 22%)"
    );
    expect(
      hoverPaper.nodes
        .filter((node): node is Declaration => node.type === "decl")
        .map((declaration) => declaration.prop)
    ).toEqual(["border-color", "box-shadow"]);
  });

  it("restores the keyboard focus rings after the hover rule in the cascade", () => {
    const hover = getAtRule("media", "(hover: hover)");
    const focusPaper = getRuleBySelectors(root, [
      ".card:focus-visible .paper",
      ".card:focus-visible:hover .paper"
    ]);

    expect(root.index(focusPaper)).toBeGreaterThan(root.index(hover));
    expect(normalize(getDeclaration(focusPaper, "box-shadow").value)).toBe(
      "0 1px 0 rgb(255 255 255 / 92%) inset, 0 0 0 3px #f6f3ec, 0 0 0 6px #3347b8, 0 30px 76px rgb(11 19 43 / 19%)"
    );
  });

  it("keeps mobile certificates readable by showing only the active card", () => {
    const mobile = getAtRule("media", "(max-width: 640px)");
    const peripheralCards = getRuleBySelectors(mobile, [
      '.card[data-slot="left"]',
      '.card[data-slot="right"]',
      '.card[data-slot="far-left"]',
      '.card[data-slot="far-right"]'
    ]);

    expect(getDeclaration(peripheralCards, "opacity").value).toBe("0");
    expect(getDeclaration(peripheralCards, "pointer-events").value).toBe(
      "none"
    );
  });
});
