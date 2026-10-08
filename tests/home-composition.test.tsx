import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "../app/page";
import { HomeAiprCapabilities } from "../components/home/HomeAiprCapabilities";
import { HomeAudienceBand } from "../components/home/HomeAudienceBand";
import { HomePositioning } from "../components/home/HomePositioning";
import { HomeProcess } from "../components/home/HomeProcess";
import { HomeResearch } from "../components/home/HomeResearch";
import { HomeServiceGrid } from "../components/home/HomeServiceGrid";
import { aiprModules } from "../content/aipr";
import { company, serviceFlow } from "../content/company";
import { researchItems } from "../content/research";
import { services } from "../content/services";

describe("homepage composition", () => {
  it("renders the confirmed company positioning", () => {
    const markup = renderToStaticMarkup(<HomePositioning />);

    expect(markup).toContain(company.shortName);
    expect(markup).toContain(company.description);
    expect(markup).toContain("企业、平台与创作者");
  });

  it("renders every AIPR capability from the content model", () => {
    const markup = renderToStaticMarkup(<HomeAiprCapabilities />);

    aiprModules.forEach((module) => {
      expect(markup).toContain(module.title);
    });
  });

  it("uses the homepage CTA variant without restoring video or poster media", () => {
    const aiprMarkup = renderToStaticMarkup(<HomeAiprCapabilities />);
    const pageMarkup = renderToStaticMarkup(<HomePage />);

    expect(pageMarkup).toContain('data-cta-variant="home"');
    expect(pageMarkup).not.toContain("<video");
    expect(pageMarkup).not.toContain("home-growth-cta-poster.jpg");
    expect(aiprMarkup).toContain('data-aipr-tone="warm-light"');
  });

  it("uses the curved blank-card hero and keeps the old carousel unmounted", () => {
    const pageMarkup = renderToStaticMarkup(<HomePage />);

    expect(pageMarkup).toContain('data-curved-hero="true"');
    expect(pageMarkup).not.toContain('aria-roledescription="carousel"');
    expect(pageMarkup).not.toContain("home-video-hero");
    expect(pageMarkup.match(/data-curved-hero-fallback-card/g) ?? []).toHaveLength(8);
  });

  it("places the partner logo band after the hero and before positioning", () => {
    const pageMarkup = renderToStaticMarkup(<HomePage />);
    const bandMarkup = renderToStaticMarkup(<HomeAudienceBand />);
    const heroIndex = pageMarkup.indexOf('data-curved-hero="true"');
    const audienceIndex = pageMarkup.indexOf('data-home-audience-band="true"');
    const positioningIndex = pageMarkup.indexOf("公司定位");

    expect(bandMarkup).toContain("合作伙伴");
    expect(heroIndex).toBeGreaterThanOrEqual(0);
    expect(audienceIndex).toBeGreaterThan(heroIndex);
    expect(positioningIndex).toBeGreaterThan(audienceIndex);
  });

  it("applies a consistent scroll reveal treatment to homepage modules", () => {
    const markup = renderToStaticMarkup(<HomePage />);

    expect(markup.match(/scroll-reveal/g) ?? []).toHaveLength(6);
  });

  it("renders all service products and the four process steps", () => {
    const serviceMarkup = renderToStaticMarkup(<HomeServiceGrid />);
    const processMarkup = renderToStaticMarkup(<HomeProcess />);

    services.forEach((service) => {
      expect(serviceMarkup).toContain(service.title);
    });
    expect(serviceFlow).toHaveLength(4);
    serviceFlow.forEach((step) => {
      expect(processMarkup).toContain(step.title);
    });
  });

  it("renders compliance and current research entry points", () => {
    const markup = renderToStaticMarkup(<HomeResearch />);

    expect(markup).toContain("合规研究");
    researchItems.slice(0, 3).forEach((item) => {
      expect(markup).toContain(item.title);
      expect(markup).toContain(`/news/${item.slug}`);
    });
  });

  it("keeps every required homepage content module in order", () => {
    const markup = renderToStaticMarkup(<HomePage />);
    const heroIndex = markup.indexOf('data-curved-hero="true"');
    const audienceIndex = markup.indexOf('data-home-audience-band="true"');
    const positioningIndex = markup.indexOf("公司定位");
    const aiprIndex = markup.indexOf("星眸AIPR");
    const scenarioIndex = markup.indexOf("服务场景");
    const serviceIndex = markup.indexOf("服务产品");
    const processIndex = markup.indexOf("服务流程");
    const qualificationsIndex = markup.indexOf("母公司资质与行业认可");
    const ctaIndex = markup.indexOf('data-cta-variant="home"');

    expect(heroIndex).toBeGreaterThanOrEqual(0);
    expect(audienceIndex).toBeGreaterThan(heroIndex);
    expect(positioningIndex).toBeGreaterThan(audienceIndex);
    expect(aiprIndex).toBeGreaterThan(positioningIndex);
    expect(scenarioIndex).toBeGreaterThan(aiprIndex);
    expect(serviceIndex).toBeGreaterThan(scenarioIndex);
    expect(processIndex).toBeGreaterThan(serviceIndex);
    expect(qualificationsIndex).toBeGreaterThan(processIndex);
    expect(ctaIndex).toBeGreaterThan(qualificationsIndex);
  });
});
