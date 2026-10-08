import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readStyles(...segments: string[]) {
  return readFileSync(join(process.cwd(), ...segments), "utf8").toLowerCase();
}

describe("homepage warm ivory color system", () => {
  it("uses the approved shared warm-ivory-to-white AIPR gradient", () => {
    const componentCss = readStyles(
      "components",
      "home",
      "HomeAiprCapabilities.module.css"
    );
    const componentSource = readStyles(
      "components",
      "home",
      "HomeAiprCapabilities.tsx"
    );
    const sharedCss = readStyles(
      "components",
      "common",
      "SectionGradient.module.css"
    );
    const ivoryToWhite = [...sharedCss.matchAll(
      /\.ivorytowhite\s*\{([\s\S]*?)\}/g
    )]
      .map((match) => match[1])
      .find((block) => block.includes("background-image"));
    expect(componentSource).toContain("gradientstyles.ivorytowhite");
    expect(ivoryToWhite).toContain(
      "background-image: linear-gradient("
    );
    expect(ivoryToWhite).toContain("var(--sb-ivory)");
    expect(ivoryToWhite).toContain("var(--sb-air)");
    expect(ivoryToWhite).toContain("var(--sb-white)");
    expect(sharedCss).not.toContain(".ivorytowhite::after");
    expect(componentCss).not.toMatch(
      /\.section\s*\{[^}]*background(?:-color|-image)?\s*:/
    );
    expect(componentCss).not.toContain("background: #0b132b");
  });

  it("removes isolated near-black and saturated cobalt card fills", () => {
    const scenarioCss = readStyles(
      "components",
      "home",
      "HomeScenarioStrip.module.css"
    );
    const serviceCss = readStyles(
      "components",
      "home",
      "HomeServiceGrid.module.css"
    );

    expect(scenarioCss).not.toContain("--card-background: #0b132b");
    expect(scenarioCss).not.toContain("--card-background: #3347b8");
    expect(serviceCss).not.toContain("background: #0b132b");
    expect(serviceCss).not.toContain("background: #3347b8");
  });

  it("uses mineral blue rather than ink navy for the home closing CTA", () => {
    const css = readStyles(
      "components",
      "common",
      "CTASection.module.css"
    );

    expect(css).toContain("background: #355792");
    expect(css).not.toContain("background: #0b132b");
  });
});
