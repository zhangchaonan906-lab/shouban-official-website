import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("site layout regression contracts", () => {
  it("does not animate an entire tall AIPR container from transparent", () => {
    const source = read("components/home/HomeAiprCapabilities.tsx");

    expect(source).toContain("<Container className={styles.container}>");
    expect(source).not.toContain(
      '<Container className={`scroll-reveal ${styles.container}`}>'
    );
  });

  it("uses gradual tablet layouts instead of narrow-card breakpoint cliffs", () => {
    const scenario = read("components/home/HomeScenarioStrip.module.css");
    const services = read("components/home/HomeServiceGrid.module.css");
    const process = read("components/home/HomeProcess.module.css");
    const aipr = read("components/home/HomeAiprCapabilities.module.css");

    expect(services).toMatch(
      /@media\s*\(min-width:\s*810px\)\s*and\s*\(max-width:\s*1199px\)/
    );
    expect(process).toMatch(
      /@media\s*\(min-width:\s*720px\)\s*and\s*\(max-width:\s*1279px\)/
    );
    expect(scenario).toMatch(
      /\.railItem\s*\{[^}]*width:\s*clamp\(300px,\s*28vw,\s*360px\)/s
    );
    expect(services).toMatch(/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    expect(process).toMatch(/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    expect(services).toContain(
      "@media (min-width: 810px) and (max-width: 1199px)"
    );
    expect(services).not.toContain("@media (max-width: 1024px)");
    expect(process).not.toContain("@media (max-width: 900px)");
    expect(read("components/home/HomePositioning.module.css")).toContain(
      "@media (max-width: 1199px)"
    );
    expect(aipr).toContain("@media (max-width: 1199px)");
    expect(aipr).not.toContain("@media (max-width: 1024px)");
  });

  it("keeps CTA, hero actions, and certificate cards continuous around tablet widths", () => {
    const cta = read("components/common/CTASection.module.css");
    const hero = read("components/home/CurvedHero.module.css");
    const qualifications = read(
      "components/home/QualificationCarousel.module.css"
    );

    expect(cta).toContain("@media (max-width: 809px)");
    expect(cta).not.toContain("@media (max-width: 719px)");
    expect(hero).toMatch(
      /@media\s*\(max-width:\s*810px\)[\s\S]*?\.actions\s*\{[^}]*top:\s*auto;[^}]*bottom:\s*clamp\(112px,\s*15vh,\s*150px\)/s
    );
    expect(hero).toMatch(
      /@media\s*\(max-width:\s*767px\)[\s\S]*?\.fallbackCard\s*\{[^}]*width:\s*min\(86vw,\s*390px\)/s
    );
    expect(hero).toMatch(
      /@media\s*\(min-width:\s*811px\)\s*and\s*\(max-height:\s*760px\)[\s\S]*?\.actions\s*\{[^}]*top:\s*auto;[^}]*bottom:\s*clamp\(76px,\s*12vh,\s*92px\)/s
    );
    expect(qualifications).toMatch(
      /--card-width:\s*clamp\(220px,\s*24vw,\s*286px\)/
    );
    expect(qualifications).toMatch(
      /\.stage\s*\{[^}]*height:\s*clamp\(300px,\s*35vw,\s*390px\)/s
    );
    expect(qualifications).toMatch(
      /\.carousel\s*\{[^}]*overflow:\s*hidden/s
    );
    expect(qualifications).toMatch(
      /@media\s*\(max-width:\s*640px\)[\s\S]*?\.stage\s*\{[^}]*width:\s*100%;[^}]*margin-left:\s*0/s
    );
    const tabletQualificationRules = qualifications.slice(
      qualifications.indexOf("@media (max-width: 900px)"),
      qualifications.indexOf("@media (max-width: 640px)")
    );
    expect(tabletQualificationRules).not.toContain("--card-width");
    expect(tabletQualificationRules).not.toMatch(/\.stage\s*\{/);
  });

  it("preserves the approved homepage handoff rhythm", () => {
    const scenario = read("components/home/HomeScenarioStrip.module.css");
    const services = read("components/home/HomeServiceGrid.module.css");
    const process = read("components/home/HomeProcess.module.css");
    const aipr = read("components/home/HomeAiprCapabilities.module.css");
    const positioning = read("components/home/HomePositioning.module.css");
    const research = read("components/home/HomeResearch.module.css");

    expect(positioning).toMatch(
      /\.section\s*\{[^}]*padding-block:\s*clamp\(64px,\s*6\.5vw,\s*92px\)\s*clamp\(40px,\s*3\.5vw,\s*52px\)/s
    );
    expect(aipr).toMatch(
      /\.section\s*\{[^}]*padding-block:\s*clamp\(44px,\s*4vw,\s*56px\)\s*clamp\(64px,\s*6\.5vw,\s*92px\)/s
    );
    expect(scenario).toMatch(
      /\.section\s*\{[^}]*padding-block:\s*clamp\(64px,\s*5\.5vw,\s*84px\)\s*0/s
    );
    expect(scenario).toMatch(
      /\.section::after\s*\{[^}]*height:\s*clamp\(30px,\s*4vw,\s*44px\)/s
    );
    expect(services).toMatch(
      /\.section\s*\{[^}]*padding-block:\s*clamp\(56px,\s*5\.5vw,\s*80px\)\s*0/s
    );
    expect(services).toMatch(
      /\.section::after\s*\{[^}]*height:\s*clamp\(30px,\s*4vw,\s*44px\)/s
    );
    expect(process).toMatch(
      /\.section\s*\{[^}]*padding-block:\s*clamp\(56px,\s*5\.5vw,\s*80px\)\s*clamp\(64px,\s*6vw,\s*88px\)/s
    );
    expect(research).toMatch(
      /\.qualificationsContainer\s*\{[^}]*padding-top:\s*clamp\(64px,\s*6vw,\s*88px\)/s
    );
  });

  it("aligns the partner rail to the primary grid and softens the scenario entry", () => {
    const audience = read("components/home/HomeAudienceBand.module.css");
    const scenario = read("components/home/HomeScenarioStrip.module.css");

    expect(audience).toMatch(/\.inner\s*\{[^}]*width:\s*min\(100%,\s*1280px\)/s);
    expect(scenario).toMatch(
      /\.section\s*\{[^}]*background-color:\s*#f7faff;[^}]*linear-gradient\(to bottom,\s*#fff 0,\s*#f7faff 48px\)/s
    );
  });

  it("keeps default CTAs contained, separated from the footer, and isolates legacy home CTA classes", () => {
    const source = read("components/common/CTASection.tsx");
    const css = read("components/common/CTASection.module.css");

    expect(source).toContain('isHome && "home-contact-cta"');
    expect(source).not.toContain('"home-contact-cta scroll-reveal"');
    expect(css).toMatch(
      /\.fluentSurface\s*\{[^}]*width:\s*min\(calc\(100% - 64px\),\s*var\(--sb-container\)\)[^}]*margin:\s*0 auto;[^}]*margin-block-end:\s*clamp\(56px,\s*5vw,\s*80px\)/s
    );
    expect(css).toContain("@media (max-width: 809px)");
    expect(css).toMatch(
      /@media\s*\(max-width:\s*809px\)[\s\S]*?\.fluentSurface\s*\{[^}]*width:\s*calc\(100% - 32px\)[^}]*margin:\s*0 auto;[^}]*margin-block-end:\s*48px/s
    );
  });

  it("removes the empty PageHero slab at every viewport", () => {
    const source = read("components/common/PageHero.tsx");
    const css = read("components/common/PageHero.module.css");

    expect(source).not.toContain("glassAccent");
    expect(source).not.toContain("glowSecondary");
    expect(css).not.toContain(".glassAccent");
    expect(css).not.toContain(".glowSecondary");
    expect(css).toContain("@media (max-width: 809px)");
  });

  it("uses accessible mobile navigation targets and contained overscroll", () => {
    const source = read("components/layout/Navbar.tsx");
    const css = read("components/layout/Navbar.module.css");

    expect(source).toContain("h-11 w-11");
    expect(source).not.toContain("h-9 w-9");
    expect(css).toMatch(/\.mobilePanel\s*\{[^}]*overscroll-behavior:\s*contain/s);
  });

  it("keeps About capability cards readable at tablet widths", () => {
    const source = read("app/about/page.tsx");

    expect(source).toContain("sm:grid-cols-2");
    expect(source).not.toContain("xl:grid-cols-3");
    expect(source).not.toContain('className="grid gap-4 sm:grid-cols-3"');
  });
});
