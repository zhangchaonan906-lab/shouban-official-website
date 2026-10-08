import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("sitewide warm ivory color system", () => {
  it("uses the approved palette in shared presentation components", () => {
    const pageHero = read("components/common/PageHero.tsx");
    const pageHeroStyles = read("components/common/PageHero.module.css");
    const featureCard = read("components/common/FeatureCard.tsx");
    const fluentSurfaceStyles = read("components/common/FluentSurface.module.css");
    const sectionHeader = read("components/common/SectionHeader.tsx");
    const cta = read("components/common/CTASection.tsx");
    const ctaStyles = read("components/common/CTASection.module.css");

    expect(pageHero).toContain('data-interior-page-hero="true"');
    expect(pageHeroStyles).toContain("var(--sb-ivory) 0%");
    expect(pageHeroStyles).toContain("var(--sb-mist) 100%");
    expect(pageHero).not.toContain("bg-grid-light");
    expect(featureCard).toContain('data-fluent-surface="standard"');
    expect(featureCard).toContain("surfaceStyles.standard");
    expect(featureCard).toContain("surfaceStyles.icon");
    expect(featureCard).not.toContain("bg-white/80");
    expect(featureCard).not.toContain("border-slate-200");
    expect(fluentSurfaceStyles).toContain("background: rgba(255, 255, 255, 0.68)");
    expect(fluentSurfaceStyles).toContain("background: rgba(237, 243, 255, 0.78)");
    expect(sectionHeader).toContain('tone === "dark" ? "text-sky-300" : "text-[#3347b8]"');
    expect(sectionHeader).toContain('tone === "dark" ? "text-white" : "text-[#0b132b]"');
    expect(cta).toContain("styles.brandSurface");
    expect(cta).toContain("surfaceStyles.elevated");
    expect(ctaStyles).toContain(".fluentSurface");
    expect(ctaStyles).not.toMatch(/\.fluentSurface\s*\{[^}]*background:/s);
    expect(ctaStyles).not.toMatch(/\.fluentSurface\s*\{[^}]*backdrop-filter:/s);
  });

  it("removes large dark bands from business pages", () => {
    const businessPages = [
      "app/solutions/page.tsx",
      "app/services/page.tsx",
      "app/aipr/page.tsx",
      "app/trust/page.tsx",
      "app/compliance/page.tsx",
      "app/news/page.tsx",
      "app/about/page.tsx"
    ]
      .map(read)
      .join("\n");

    expect(businessPages).not.toContain("bg-slate-950");
    expect(businessPages).not.toContain('tone="dark"');
    expect(read("app/trust/page.tsx")).toContain("bg-[#edf3ff]");
  });

  it("coordinates contact surfaces while keeping legal reading canvases white", () => {
    const globals = read("app/globals.css");
    const disclaimer = read("app/disclaimer/page.tsx");
    const contactShell = read("components/contact/interactive-contact-shell.tsx");
    const fluentSurfaceStyles = read("components/common/FluentSurface.module.css");

    expect(globals).toMatch(
      /\.contact-page-stage\s*\{[\s\S]*?background:[\s\S]*?linear-gradient/
    );
    expect(contactShell).toContain("surfaceStyles.elevated");
    expect(globals).not.toMatch(
      /\.contact-interactive-shell\s*\{[^}]*backdrop-filter:/s
    );
    expect(fluentSurfaceStyles).toContain("backdrop-filter: blur(20px) saturate(120%)");
    expect(globals).toMatch(
      /\.contact-character-stage\s*\{[\s\S]*?background: linear-gradient\(145deg, rgb\(237 243 255 \/ 88%\), rgb\(247 250 255 \/ 72%\)\);/
    );
    expect(globals).toMatch(
      /\.privacy-policy\s*\{[\s\S]*?background: rgb\(255 255 255 \/ 88%\);/
    );
    expect(disclaimer).toContain(
      "surfaceStyles.standard"
    );
  });
});
