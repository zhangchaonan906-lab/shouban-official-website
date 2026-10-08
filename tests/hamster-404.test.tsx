import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { HamsterWheel } from "../components/common/HamsterWheel";
import styles from "../components/common/HamsterWheel.module.css";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className
  }: {
    children: ReactNode;
    href: string;
    className?: string;
  }) => (
    <a className={className} href={href}>
      {children}
    </a>
  )
}));

import NotFound from "../app/not-found";

const componentPath = join(
  process.cwd(),
  "components",
  "common",
  "HamsterWheel.tsx"
);
const stylesheetPath = join(
  process.cwd(),
  "components",
  "common",
  "HamsterWheel.module.css"
);
const thirdPartyNoticesPath = join(
  process.cwd(),
  "THIRD_PARTY_NOTICES.md"
);

function extractMediaBlock(css: string, query: string) {
  const uncommentedCss = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const marker = `@media ${query}`;
  const mediaStart = uncommentedCss.indexOf(marker);

  if (mediaStart === -1) {
    throw new Error(`Could not find media query: ${query}`);
  }

  const openingBrace = uncommentedCss.indexOf(
    "{",
    mediaStart + marker.length
  );

  if (openingBrace === -1) {
    throw new Error(`Could not find opening brace for media query: ${query}`);
  }

  let depth = 0;

  for (let index = openingBrace; index < uncommentedCss.length; index += 1) {
    if (uncommentedCss[index] === "{") depth += 1;
    if (uncommentedCss[index] === "}") depth -= 1;

    if (depth === 0) {
      return uncommentedCss.slice(openingBrace + 1, index);
    }
  }

  throw new Error(`Could not find closing brace for media query: ${query}`);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function classNamesForDataAttribute(
  markup: string,
  attribute: string,
  value: string
) {
  const tags =
    markup.match(
      new RegExp(
        `<[^>]*\\b${escapeRegExp(attribute)}="${escapeRegExp(value)}"[^>]*>`,
        "g"
      )
    ) ?? [];

  return tags.map((tag) => {
    const classAttribute = tag.match(/\bclass="([^"]*)"/)?.[1];

    if (classAttribute === undefined) {
      throw new Error(`Could not find class attribute on tag: ${tag}`);
    }

    return classAttribute.split(/\s+/).filter(Boolean);
  });
}

function removeMediaBlock(css: string, query: string) {
  const uncommentedCss = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blockContents = extractMediaBlock(uncommentedCss, query);
  const marker = `@media ${query}`;
  const mediaStart = uncommentedCss.indexOf(marker);
  const openingBrace = uncommentedCss.indexOf(
    "{",
    mediaStart + marker.length
  );
  const afterClosingBrace = openingBrace + blockContents.length + 2;

  return (
    uncommentedCss.slice(0, mediaStart) +
    uncommentedCss.slice(afterClosingBrace)
  );
}

describe("HamsterWheel", () => {
  it("renders the complete decorative hamster wheel structure", () => {
    const markup = renderToStaticMarkup(<HamsterWheel />);

    expect(markup).toContain('data-hamster-wheel="true"');
    expect(markup).toContain('aria-hidden="true"');

    const rootClassNames = classNamesForDataAttribute(
      markup,
      "data-hamster-wheel",
      "true"
    );

    expect(rootClassNames).toHaveLength(1);
    expect(rootClassNames[0]).toContain(styles.root);

    for (const part of [
      "wheel",
      "hamster",
      "body",
      "head",
      "ear",
      "eye",
      "nose",
      "tail",
      "spoke"
    ]) {
      expect(markup).toContain(`data-part="${part}"`);
    }

    for (const [part, expectedClassName] of Object.entries({
      wheel: styles.wheel,
      hamster: styles.hamster,
      body: styles.body,
      head: styles.head,
      ear: styles.ear,
      eye: styles.eye,
      nose: styles.nose,
      tail: styles.tail,
      spoke: styles.spoke
    })) {
      const classNames = classNamesForDataAttribute(markup, "data-part", part);

      expect(classNames).toHaveLength(1);
      expect(classNames[0]).toContain(expectedClassName);
    }

    expect(markup.match(/data-part="limb"/g) ?? []).toHaveLength(4);

    const limbClassNames = classNamesForDataAttribute(
      markup,
      "data-part",
      "limb"
    );

    for (const [index, directionClassName] of [
      styles.frontRight,
      styles.frontLeft,
      styles.backRight,
      styles.backLeft
    ].entries()) {
      expect(limbClassNames[index]).toEqual(
        expect.arrayContaining([styles.limb, directionClassName])
      );
    }
  });

  it("contains no interactive controls or focus target", () => {
    const markup = renderToStaticMarkup(<HamsterWheel />);

    expect(markup).not.toMatch(/<(?:a|button|input|select|textarea)\b/i);
    expect(markup).not.toMatch(/\btabindex\s*=/i);
  });

  it("stays a hook-free React Server Component", () => {
    const source = readFileSync(componentPath, "utf8");

    expect(source).not.toContain("use client");
    expect(source).not.toMatch(/\buse(?:State|Effect|LayoutEffect)\b/);
    expect(source).not.toMatch(/\bon[A-Z][A-Za-z]*\s*=/);
  });

  it("runs for three one-second cycles and preserves the final frame", () => {
    const css = readFileSync(stylesheetPath, "utf8");

    expect(css).toMatch(/--hamster-cycle\s*:\s*1s\s*;/);
    expect(css).toMatch(/--hamster-iterations\s*:\s*3\s*;/);
    expect(css).toMatch(
      /animation-iteration-count\s*:\s*var\(--hamster-iterations\)\s*;/
    );
    expect(css).toMatch(/animation-fill-mode\s*:\s*forwards\s*;/);
    expect(css).not.toMatch(/\binfinite\b/);
  });

  it("keeps every animated part on the shared animation contract", () => {
    const css = readFileSync(stylesheetPath, "utf8");
    const uncommentedCss = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const expectedAnimatedSelectors = [
      ".hamster",
      ".head",
      ".ear",
      ".eye",
      ".body",
      ".frontRight",
      ".frontLeft",
      ".backRight",
      ".backLeft",
      ".tail",
      ".spoke"
    ];
    const sharedRule = [
      ...uncommentedCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)
    ]
      .map((match) => ({
        selectors: match[1].split(",").map((selector) => selector.trim()),
        declarations: match[2]
      }))
      .find(
        ({ selectors, declarations }) =>
          selectors.includes(".hamster") &&
          selectors.includes(".spoke") &&
          /\banimation-duration\s*:/.test(declarations)
      );

    expect(sharedRule).toBeDefined();
    expect(sharedRule?.selectors).toEqual(
      expect.arrayContaining(expectedAnimatedSelectors)
    );
    expect(sharedRule?.selectors).toHaveLength(expectedAnimatedSelectors.length);
    expect(sharedRule?.declarations).toMatch(
      /animation-duration\s*:\s*var\(--hamster-cycle\)\s*;/
    );
    expect(sharedRule?.declarations).toMatch(
      /animation-iteration-count\s*:\s*var\(--hamster-iterations\)\s*;/
    );
    expect(sharedRule?.declarations).toMatch(
      /animation-fill-mode\s*:\s*forwards\s*;/
    );

    const animationNames = [
      ...uncommentedCss.matchAll(/\banimation-name\s*:\s*([^;]+);/g)
    ].flatMap((match) =>
      match[1]
        .split(",")
        .map((animationName) => animationName.trim())
        .filter(Boolean)
    );

    expect(animationNames.length).toBeGreaterThan(0);

    for (const animationName of animationNames) {
      expect(uncommentedCss).toMatch(
        new RegExp(`@keyframes\\s+${escapeRegExp(animationName)}\\b`)
      );
    }

    const cssWithoutReducedMotion = removeMediaBlock(
      css,
      "(prefers-reduced-motion: reduce)"
    );

    expect(cssWithoutReducedMotion).not.toMatch(/\banimation\s*:/);
  });

  it("uses the required desktop and mobile rendered sizes", () => {
    const css = readFileSync(stylesheetPath, "utf8");
    const mobileCss = extractMediaBlock(css, "(max-width: 639px)");
    const desktopCss = css.slice(0, css.indexOf("@media"));

    expect(desktopCss).toMatch(/\.root\s*\{[^}]*font-size\s*:\s*14px\s*;/s);
    expect(desktopCss).toMatch(/\.root\s*\{[^}]*width\s*:\s*12em\s*;/s);
    expect(desktopCss).toMatch(/\.root\s*\{[^}]*height\s*:\s*12em\s*;/s);
    expect(mobileCss).toMatch(/\.root\s*\{[^}]*font-size\s*:\s*10px\s*;/s);
  });

  it("removes all motion when reduced motion is requested", () => {
    const css = readFileSync(stylesheetPath, "utf8");
    const reducedMotionCss = extractMediaBlock(
      css,
      "(prefers-reduced-motion: reduce)"
    );

    expect(reducedMotionCss).not.toMatch(/\.root\s+\*/);

    for (const selector of [
      ".root",
      ".wheel",
      ".hamster",
      ".body",
      ".head",
      ".ear",
      ".eye",
      ".nose",
      ".frontRight",
      ".frontLeft",
      ".backRight",
      ".backLeft",
      ".tail",
      ".spoke"
    ]) {
      expect(reducedMotionCss).toContain(selector);
    }

    expect(reducedMotionCss).toMatch(
      /animation\s*:\s*none\s*!important\s*;/
    );
  });
});

describe("404 page", () => {
  it("renders the hamster-led recovery message without the old route inventory", () => {
    const markup = renderToStaticMarkup(<NotFound />);
    const hamsterIndex = markup.indexOf('data-hamster-wheel="true"');
    const statusIndex = markup.indexOf(">404</p>");

    expect.soft(markup.match(/data-hamster-wheel="true"/g) ?? []).toHaveLength(1);
    expect.soft(markup).toContain("404");
    expect.soft(markup).toContain("页面未找到");
    expect.soft(markup).toContain(
      "小仓鼠跑错路了。当前页面可能已移动或暂未开放，请返回首页继续浏览。"
    );
    expect.soft(markup).toContain('href="/"');
    expect.soft(markup).toContain("返回首页");
    expect.soft(hamsterIndex).toBeGreaterThanOrEqual(0);
    expect.soft(statusIndex).toBeGreaterThan(hamsterIndex);
    expect.soft(markup).not.toContain("当前官网第一阶段开放");
    expect.soft(markup).not.toContain(
      "首页、星眸AIPR、服务产品、合规研究、新闻与研究、关于我们、联系我们、隐私政策、免责声明。"
    );
  });
});

describe("third-party notices", () => {
  it("documents the hamster wheel animation provenance and MIT license", () => {
    const notices = readFileSync(thirdPartyNoticesPath, "utf8");
    const heading = "## Hamster Wheel Empty-State Animation";
    const headingMatches = [
      ...notices.matchAll(/^## Hamster Wheel Empty-State Animation$/gm)
    ];
    const sectionStart = headingMatches[0]?.index ?? -1;
    const nextHeadingMatch =
      sectionStart === -1
        ? null
        : /^## /m.exec(notices.slice(sectionStart + heading.length));
    const sectionEnd =
      sectionStart === -1
        ? 0
        : nextHeadingMatch === null
          ? notices.length
          : sectionStart + heading.length + nextHeadingMatch.index;
    const hamsterNotice =
      sectionStart === -1 ? "" : notices.slice(sectionStart, sectionEnd);

    expect.soft(headingMatches).toHaveLength(1);
    expect.soft(notices).toContain("Hamster Wheel Empty-State Animation");
    expect.soft(hamsterNotice).toContain("https://uiverse.io/Nawsome/wet-mayfly-23");
    expect.soft(hamsterNotice).toContain(
      "https://github.com/uiverse-io/galaxy/blob/main/loaders/Nawsome_wet-mayfly-23.html"
    );
    expect.soft(hamsterNotice).toContain("https://codepen.io/jkantner/pen/wvqeXrQ");
    expect.soft(hamsterNotice).toContain("Copyright - 2026 Nawsome");
    expect.soft(hamsterNotice).toContain("Copyright (c) 2023 Uiverse.io");
    expect.soft(hamsterNotice).toContain("Licensed under the MIT License.");
    expect.soft(hamsterNotice).toContain(
      "Permission is hereby granted, free of charge, to any person obtaining a copy"
    );
    expect.soft(hamsterNotice).toContain(
      "The above copyright notice and this permission notice shall be included"
    );
    expect.soft(hamsterNotice).toContain('THE SOFTWARE IS PROVIDED "AS IS"');
    expect.soft(hamsterNotice).toMatch(
      /OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\r?\nSOFTWARE\./
    );
  });
});
