// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { HomeAudienceBand } from "@/components/home/HomeAudienceBand";

const partnerNames = [
  "百度网盘",
  "百度文库",
  "第一视频",
  "Wemade",
  "视觉中国",
  "方正集团",
  "腾讯视频",
  "京东",
  "快手",
  "新片场",
  "学科网",
  "优酷",
] as const;

const audienceStyles = readFileSync(
  resolve(process.cwd(), "components/home/HomeAudienceBand.module.css"),
  "utf8"
);
const audienceSource = readFileSync(
  resolve(process.cwd(), "components/home/HomeAudienceBand.tsx"),
  "utf8"
);
const gradientStyles = readFileSync(
  resolve(process.cwd(), "components/common/SectionGradient.module.css"),
  "utf8"
);
const firstMediaQueryIndex = audienceStyles.indexOf("@media");

if (firstMediaQueryIndex === -1) {
  throw new Error("Missing responsive CSS blocks for HomeAudienceBand");
}

const baseStyles = audienceStyles.slice(0, firstMediaQueryIndex);

function extractCssBlock(css: string, opening: string) {
  const openingIndex = css.indexOf(opening);
  if (openingIndex === -1) throw new Error(`Missing CSS block: ${opening}`);

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

describe("HomeAudienceBand", () => {
  it("renders one accessible partner-logo group and hides loop duplicates", () => {
    const { container } = render(<HomeAudienceBand />);
    const region = screen.getByRole("region", { name: "合作伙伴" });
    const primaryGroup = container.querySelector(
      "[data-home-partner-group]:not([aria-hidden])"
    );
    const groups = container.querySelectorAll("[data-home-partner-group]");
    const repeatedGroups = container.querySelectorAll(
      '[data-home-partner-group][aria-hidden="true"]'
    );

    expect(region.getAttribute("data-home-audience-band")).toBe("true");
    expect(screen.getByText("合作伙伴")).toBeTruthy();
    expect(primaryGroup).not.toBeNull();
    expect(groups).toHaveLength(4);
    expect(repeatedGroups).toHaveLength(3);
    expect(primaryGroup?.querySelectorAll("img")).toHaveLength(partnerNames.length);
    expect(
      Array.from(primaryGroup?.querySelectorAll("img") ?? []).map((image) =>
        image.getAttribute("alt")
      )
    ).toEqual(partnerNames);
    expect(
      Array.from(primaryGroup?.querySelectorAll("img") ?? []).every(
        (image) => image.getAttribute("loading") === "lazy"
      )
    ).toBe(true);
    repeatedGroups.forEach((group) => {
      expect(group.querySelectorAll("img")).toHaveLength(partnerNames.length);
      expect(
        Array.from(group.querySelectorAll("img")).every(
          (image) => image.getAttribute("alt") === ""
        )
      ).toBe(true);
    });
    expect(container.querySelector("[data-home-audience-pill]")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("uses a borderless horizon-to-blue continuation and seamless restrained loop", () => {
    const bandDeclarations = declarationsForSelector(baseStyles, ".band");
    const innerDeclarations = declarationsForSelector(baseStyles, ".inner");
    const sharedDeclarations = declarationsForSelector(
      gradientStyles,
      ".horizonToBlue"
    );
    const trackDeclarations = declarationsForSelector(baseStyles, ".track");
    const tickerKeyframes = extractCssBlock(
      audienceStyles,
      "@keyframes partnerTicker"
    );

    expect(audienceSource).toContain("gradientStyles.horizonToBlue");
    expect(sharedDeclarations).toContain(
      "background-image: linear-gradient(180deg, #f4f8ff 0%, var(--sb-air) 52%, var(--sb-mist) 100%)"
    );
    expect(gradientStyles).not.toContain(".horizonToBlue::after");
    expect([...bandDeclarations].join(" ")).not.toMatch(
      /background(?:-color|-image)?\s*:/
    );
    expect([...bandDeclarations].join(" ")).not.toMatch(
      /border-(top|bottom|block)|#f6f3ec|#eef1f2/
    );
    expect(innerDeclarations).toContain("min-height: 80px");
    expect(innerDeclarations).toContain("padding: 12px 32px");
    expect(trackDeclarations).toContain("width: max-content");
    expect(trackDeclarations).toContain("transform: translateX(0)");
    expect(trackDeclarations).toContain(
      "animation: partnerTicker 32s linear infinite"
    );
    expect(baseStyles).not.toContain(".trackPaused");
    expect(declarationsForSelector(tickerKeyframes, "to")).toContain(
      "transform: translateX(-25%)"
    );
  });

  it("normalizes logo presentation and supports responsive motion fallbacks", () => {
    const logoDeclarations = declarationsForSelector(baseStyles, ".logo");
    const mobileBlock = extractCssBlock(
      audienceStyles,
      "@media (max-width: 810px)"
    );
    const reducedMotionBlock = extractCssBlock(
      audienceStyles,
      "@media (prefers-reduced-motion: reduce)"
    );

    expect(logoDeclarations).toContain("object-fit: contain");
    expect(logoDeclarations).toContain("width: auto");
    expect(declarationsForSelector(mobileBlock, ".inner")).toContain(
      "flex-direction: column"
    );
    expect(declarationsForSelector(reducedMotionBlock, ".track")).toContain(
      "animation: none"
    );
    expect(
      declarationsForSelector(reducedMotionBlock, ".repeatedGroup")
    ).toContain("display: none");
  });
});
