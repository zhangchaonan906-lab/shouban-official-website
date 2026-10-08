import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  join(process.cwd(), "app", "globals.css"),
  "utf8"
);

function cssBlock(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`));

  if (!match) {
    throw new Error(`Missing CSS block for ${selector}`);
  }

  return match[1];
}

describe("light hero visual style", () => {
  it("defines a reduced-motion-safe scroll reveal animation", () => {
    const scrollReveal = cssBlock(".scroll-reveal");

    expect(scrollReveal).toContain("transform");
    expect(css).toContain("@supports (animation-timeline: view())");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("frames slide visuals in a bright rounded visual stage", () => {
    const visualStage = cssBlock(".hero-visual-stage");

    expect(visualStage).toContain("border-radius");
    expect(visualStage).toContain("box-shadow");
  });

  it("keeps the real campus image free from a heavy dark overlay", () => {
    const overlay = cssBlock(".hero-image-overlay");

    expect(overlay).not.toMatch(
      /rgba\(\s*2\s*,\s*6\s*,\s*23\s*,\s*0\.[6-9]\d*\s*\)/
    );
  });

  it("uses light backgrounds for the placeholder slides", () => {
    expect(cssBlock(".hero-slide--monitoring")).toMatch(
      /#f8fbff|#eff6ff|#f8fafc/
    );
    expect(cssBlock(".hero-slide--compliance")).toMatch(
      /#f8fbff|#eef2ff|#f8fafc/
    );
  });

  it("removes the heavy carousel control style", () => {
    expect(css).not.toContain(".hero-carousel-control");
  });
});
