// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sceneSpy = vi.hoisted(() => vi.fn());

vi.mock("@/components/home/CurvedHeroScene", () => ({
  CurvedHeroScene: (props: unknown) => {
    sceneSpy(props);
    return <canvas data-testid="curved-hero-canvas" aria-hidden="true" />;
  }
}));

import { CurvedHero } from "@/components/home/CurvedHero";
import { curvedHeroCards } from "@/content/home";

const curvedHeroStyles = readFileSync(
  resolve(process.cwd(), "components/home/CurvedHero.module.css"),
  "utf8"
);

function extractCssBlock(css: string, opening: string) {
  const openingIndex = css.indexOf(opening);
  if (openingIndex === -1) {
    throw new Error(`Missing CSS block: ${opening}`);
  }

  const blockStart = css.indexOf("{", openingIndex + opening.length);
  if (blockStart === -1) {
    throw new Error(`Missing opening brace for CSS block: ${opening}`);
  }

  let depth = 0;
  for (let index = blockStart; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") depth -= 1;
    if (depth === 0) return css.slice(blockStart + 1, index);
  }

  throw new Error(`Missing closing brace for CSS block: ${opening}`);
}

function selectorsWithDisplayNone(css: string) {
  const selectors: string[] = [];
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;

  for (const match of css.matchAll(rulePattern)) {
    const declarations = match[2];
    if (!/(?:^|;)\s*display\s*:\s*none\s*(?:;|$)/.test(declarations)) {
      continue;
    }

    selectors.push(...match[1].split(",").map((selector) => selector.trim()));
  }

  return selectors;
}

function declarationsForSelector(css: string, targetSelector: string) {
  const declarations = new Set<string>();
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;

  for (const match of css.matchAll(rulePattern)) {
    const selectors = match[1].split(",").map((selector) => selector.trim());
    if (!selectors.includes(targetSelector)) continue;

    for (const declaration of match[2].split(";")) {
      const colonIndex = declaration.indexOf(":");
      if (colonIndex === -1) continue;

      const property = declaration.slice(0, colonIndex).trim();
      const value = declaration.slice(colonIndex + 1).trim();
      if (property && value) declarations.add(`${property}: ${value}`);
    }
  }

  return declarations;
}

function normalizedDeclarationsForSelector(css: string, targetSelector: string) {
  return new Set(
    [...declarationsForSelector(css, targetSelector)].map((declaration) =>
      declaration.replace(/\s+/g, " ")
    )
  );
}

describe("CurvedHero", () => {
  beforeEach(() => {
    sceneSpy.mockClear();
  });

  it("renders the brand message with actions below the complete carousel", () => {
    const { container } = render(<CurvedHero />);
    const hero = container.querySelector<HTMLElement>(
      '[data-curved-hero="true"]'
    );

    expect(hero).not.toBeNull();
    const content = hero?.querySelector<HTMLElement>(
      "[data-curved-hero-content]"
    );
    const heading = screen.getByRole("heading", {
      level: 1,
      name: "AIGC时代，可信数字人格权资产基础设施"
    });
    const description = hero?.querySelector("#curved-hero-description");
    const actions = hero?.querySelector<HTMLElement>(
      "[data-curved-hero-actions]"
    );

    expect(content).not.toBeNull();
    expect(content?.textContent).toContain("数字人格权资产服务");
    expect(heading.id).toBe("curved-hero-title");
    expect(heading.className).not.toContain("visuallyHidden");
    expect(
      heading.querySelector("[data-curved-hero-title-accent]")?.textContent
    ).toBe("可信数字人格权资产");
    expect(description?.tagName).toBe("P");
    expect(description?.className).not.toContain("visuallyHidden");
    expect(description?.textContent).toBe(
      "面向艺人、创作者、经纪机构、品牌方、平台企业与AI公司，提供认证、确权、监测、维权与授权服务。"
    );
    expect(
      hero?.querySelector("[data-curved-hero-focus-glow]")
    ).not.toBeNull();
    expect(actions).not.toBeNull();
    expect(actions?.parentElement).toBe(hero);
    expect(content?.nextElementSibling).toBe(actions);
    expect(content?.querySelectorAll("a")).toHaveLength(0);
    expect(actions?.querySelectorAll("a")).toHaveLength(2);
    expect(hero?.querySelector("[data-curved-hero-active-label]")).toBeNull();
    expect(hero?.querySelector("[data-curved-hero-ticker-group]")).toBeNull();
    expect(screen.getByRole("link", { name: "了解服务" }).getAttribute("href")).toBe(
      "/services"
    );
    expect(screen.getByRole("link", { name: "预约咨询" }).getAttribute("href")).toBe(
      "/contact"
    );
    expect(hero?.querySelectorAll("a")).toHaveLength(2);
    expect(hero?.querySelectorAll("button")).toHaveLength(0);
    expect(hero?.getAttribute("aria-labelledby")).toBe("curved-hero-title");
    expect(hero?.getAttribute("aria-describedby")).toBe(
      "curved-hero-description"
    );
    expect(
      hero?.querySelectorAll("[data-curved-hero-fallback-card]")
    ).toHaveLength(curvedHeroCards.length);
    expect(
      screen.getByTestId("curved-hero-canvas").getAttribute("aria-hidden")
    ).toBe("true");
    expect(sceneSpy).toHaveBeenCalledOnce();
    expect(sceneSpy).toHaveBeenCalledWith({ cards: curvedHeroCards });
  });

  it("positions the actions at the former image-label location", () => {
    const actionDeclarations = declarationsForSelector(
      curvedHeroStyles,
      ".actions"
    );
    const compactBlock = extractCssBlock(
      curvedHeroStyles,
      "@media (max-width: 810px)"
    );
    const compactActionDeclarations = declarationsForSelector(
      compactBlock,
      ".actions"
    );

    expect(actionDeclarations).toContain("position: absolute");
    expect(actionDeclarations).toContain("z-index: 7");
    expect(actionDeclarations).toContain(
      "top: calc(50% + clamp(185px, 15vw, 220px))"
    );
    expect(actionDeclarations).toContain("left: 50%");
    expect(actionDeclarations).toContain("transform: translateX(-50%)");
    expect(actionDeclarations).toContain(
      "width: min(calc(100% - 48px), 300px)"
    );
    expect(compactActionDeclarations).toContain("top: auto");
    expect(compactActionDeclarations).toContain(
      "bottom: clamp(112px, 15vh, 150px)"
    );
    expect(compactActionDeclarations).toContain(
      "width: min(calc(100% - 40px), 320px)"
    );
    expect(curvedHeroStyles).not.toContain(".activeCardMeta");
    expect(curvedHeroStyles).not.toContain(".activeCardLabel");
  });

  it("keeps the restrained desktop curves and mobile arcs behind the carousel", () => {
    const { container } = render(<CurvedHero />);

    expect(
      container.querySelectorAll(
        '[data-curved-hero-curve-side="left"] [data-curved-hero-curve]'
      )
    ).toHaveLength(16);
    expect(
      container.querySelectorAll(
        '[data-curved-hero-curve-side="right"] [data-curved-hero-curve]'
      )
    ).toHaveLength(16);
    expect(container.querySelectorAll("[data-curved-hero-mobile-arc]")).toHaveLength(4);
  });

  it("renders all eight fallback cards with their approved photos", () => {
    const { container } = render(<CurvedHero />);
    const cards = container.querySelectorAll(
      "[data-curved-hero-fallback-card]"
    );

    expect(cards).toHaveLength(8);
    cards.forEach((card, index) => {
      expect(card.getAttribute("aria-hidden")).toBe("true");
      expect((card as HTMLElement).style.getPropertyValue("--fallback-image")).toBe(
        `url("${curvedHeroCards[index].src}")`
      );
    });
  });

  it("preloads the full-bleed hero background as a high-priority image", () => {
    const markup = renderToStaticMarkup(<CurvedHero />);

    expect(markup).toMatch(
      /<link rel="preload" href="\/images\/home\/home-hero-alwayzz\.webp" as="image" fetchPriority="high"\/>/
    );
  });

  it("does not fetch offscreen fallback card photos on mobile", () => {
    const mobileBlock = extractCssBlock(
      curvedHeroStyles,
      "@media (max-width: 767px)"
    );

    for (const slot of [2, 3, 4, 5, 6]) {
      expect(
        declarationsForSelector(
          mobileBlock,
          `.fallbackCard[data-slot="${slot}"]`
        )
      ).toContain("display: none");
    }
  });

  it("keeps the canvas inert until the scene is ready", () => {
    const canvasDeclarations = declarationsForSelector(
      curvedHeroStyles,
      ".canvas"
    );
    const readyCanvasDeclarations = declarationsForSelector(
      curvedHeroStyles,
      '.canvas[data-ready="true"]'
    );

    expect(canvasDeclarations).toContain("z-index: 4");
    expect(canvasDeclarations).toContain("pointer-events: none");
    expect(canvasDeclarations).toContain("touch-action: pan-y pinch-zoom");
    expect(readyCanvasDeclarations).toContain("pointer-events: auto");
  });

  it("removes the static fallback once the transparent canvas is ready", () => {
    const fallbackDeclarations = declarationsForSelector(
      curvedHeroStyles,
      ".fallback"
    );
    const readyFallbackDeclarations = declarationsForSelector(
      curvedHeroStyles,
      '.hero:has(.canvas[data-ready="true"]) .fallback'
    );

    expect(fallbackDeclarations).toContain("transition: opacity 240ms ease");
    expect(readyFallbackDeclarations).toContain("opacity: 0");
  });

  it("keeps the original side background while using a clean blue-white bottom", () => {
    const heroDeclarations = declarationsForSelector(curvedHeroStyles, ".hero");
    const fallbackDeclarations = declarationsForSelector(
      curvedHeroStyles,
      ".fallback"
    );
    const canvasDeclarations = declarationsForSelector(
      curvedHeroStyles,
      ".canvas"
    );
    const cardDeclarations = declarationsForSelector(
      curvedHeroStyles,
      ".fallbackCard"
    );
    const backgroundDeclarations = declarationsForSelector(
      curvedHeroStyles,
      ".background"
    );
    const backgroundOverlayDeclarations = normalizedDeclarationsForSelector(
      curvedHeroStyles,
      ".background::after"
    );
    const horizonDeclarations = declarationsForSelector(
      curvedHeroStyles,
      ".horizon"
    );
    const bottomDeclarations = declarationsForSelector(
      curvedHeroStyles,
      ".bottomTransition"
    );
    const normalizedBottomDeclarations = normalizedDeclarationsForSelector(
      curvedHeroStyles,
      ".bottomTransition"
    );

    expect(heroDeclarations).toContain("--hero-surface: #fff");
    expect(heroDeclarations).toContain("--hero-horizon: #f4f8ff");
    expect(heroDeclarations).toContain(
      "min-height: max(720px, calc(100svh - 4rem - 1px))"
    );
    expect(
      [...fallbackDeclarations].some((declaration) =>
        declaration.startsWith("transform:")
      )
    ).toBe(false);
    expect(
      [...canvasDeclarations].some((declaration) =>
        declaration.startsWith("transform:")
      )
    ).toBe(false);
    expect(cardDeclarations).toContain("top: 50%");
    expect(cardDeclarations).toContain("width: clamp(420px, 50vw, 560px)");
    expect(cardDeclarations).toContain("background-size: cover");
    expect(backgroundDeclarations).toContain(
      'background-image: url("/images/home/home-hero-alwayzz.webp")'
    );
    expect(backgroundDeclarations).toContain("background-size: cover");
    expect(
      [...backgroundDeclarations].some((declaration) =>
        declaration.startsWith("filter:")
      )
    ).toBe(false);
    expect(backgroundOverlayDeclarations).toContain(
      "background: rgb(246 243 236 / 8%)"
    );
    expect(horizonDeclarations).toContain("background: var(--hero-horizon)");
    expect(horizonDeclarations).toContain("bottom: -18%");
    expect(horizonDeclarations).toContain("height: 28%");
    expect(bottomDeclarations).toContain("z-index: 5");
    expect(bottomDeclarations).toContain("height: clamp(56px, 5vw, 64px)");
    expect(bottomDeclarations).toContain("pointer-events: none");
    expect(
      [...normalizedBottomDeclarations].some(
        (declaration) =>
          declaration.startsWith("background:") &&
          declaration.includes("rgb(247 250 255 / 72%) 58%") &&
          declaration.includes("var(--hero-horizon) 100%")
      )
    ).toBe(true);
    expect(
      [...normalizedBottomDeclarations].some((declaration) =>
        /#eef1f2|rgb\(238 241 242|#f6f3ec/.test(declaration)
      )
    ).toBe(false);
    expect(
      [...bottomDeclarations].some((declaration) =>
        /^(?:-webkit-)?(?:mask-image|backdrop-filter):/.test(declaration)
      )
    ).toBe(false);
  });

  it("keeps the complete carousel centered on mobile", () => {
    const compactBlock = extractCssBlock(
      curvedHeroStyles,
      "@media (max-width: 810px)"
    );
    const mobileBlock = extractCssBlock(
      curvedHeroStyles,
      "@media (max-width: 767px)"
    );
    const mobileCardDeclarations = declarationsForSelector(
      mobileBlock,
      ".fallbackCard"
    );
    const mobileRightCardDeclarations = normalizedDeclarationsForSelector(
      mobileBlock,
      '.fallbackCard[data-slot="1"]'
    );
    const mobileLeftCardDeclarations = normalizedDeclarationsForSelector(
      mobileBlock,
      '.fallbackCard[data-slot="7"]'
    );

    expect(declarationsForSelector(compactBlock, ".background")).toContain(
      "background-position: 18% center"
    );
    expect(declarationsForSelector(compactBlock, ".sideCurves")).toContain(
      "display: none"
    );
    expect(declarationsForSelector(compactBlock, ".mobileArcs")).toContain(
      "display: block"
    );
    [compactBlock, mobileBlock].forEach((block) => {
      [".fallback", ".canvas"].forEach((selector) => {
        expect(
          [...declarationsForSelector(block, selector)].some((declaration) =>
            declaration.startsWith("transform:")
          )
        ).toBe(false);
      });
    });
    expect(mobileCardDeclarations).toContain("width: min(86vw, 390px)");
    expect(mobileRightCardDeclarations).toContain(
      "transform: translate(-50%, -50%) translateX(63%) rotateY(52deg) translateZ(-55px)"
    );
    expect(mobileLeftCardDeclarations).toContain(
      "transform: translate(-50%, -50%) translateX(-63%) rotateY(-52deg) translateZ(-55px)"
    );
  });

  it("keeps three static photo cards when reduced motion is requested", () => {
    const reducedMotionBlock = extractCssBlock(
      curvedHeroStyles,
      "@media (prefers-reduced-motion: reduce)"
    );
    const hiddenSelectors = selectorsWithDisplayNone(reducedMotionBlock);
    const hiddenFallbackSelectors = hiddenSelectors
      .filter((selector) => selector.includes(".fallbackCard"))
      .sort();

    expect(hiddenSelectors).toContain(".canvas");
    expect(
      declarationsForSelector(reducedMotionBlock, ".curveStroke")
    ).toContain("animation: none");
    expect(
      declarationsForSelector(reducedMotionBlock, ".mobileArc")
    ).toContain("animation: none");
    expect(hiddenFallbackSelectors).toEqual(
      [2, 3, 4, 5, 6].map(
        (slot) => `.fallbackCard[data-slot="${slot}"]`
      )
    );
    [0, 1, 7].forEach((slot) => {
      expect(hiddenSelectors).not.toContain(
        `.fallbackCard[data-slot="${slot}"]`
      );
    });
  });
});
