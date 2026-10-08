import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, expectTypeOf, it } from "vitest";
import { aiprModules } from "../content/aipr";
import { company, customerScenarios, navigationItems } from "../content/company";
import { complianceTopics } from "../content/compliance";
import {
  curvedHeroCards,
  heroCapabilities,
  heroSlides,
  homeAudienceLabels,
  type HeroSlide
} from "../content/home";
import { legalPages } from "../content/legal";
import { megaMenus, primaryNavigation } from "../content/navigation";
import { getResearchItem, researchItems } from "../content/research";
import { services } from "../content/services";
import { routes, type SiteRoute } from "../lib/constants";

type NavigationHref = SiteRoute | `${SiteRoute}#${string}`;

function assertReadonlyContentContracts() {
  // @ts-expect-error Navigation content is deeply readonly.
  primaryNavigation[0].label = "不可修改";
  // @ts-expect-error Mega Menu columns are deeply readonly.
  megaMenus.services.columns[0].title = "不可修改";
  // @ts-expect-error Curved hero slots are readonly.
  curvedHeroCards[0].src = "/images/not-allowed.jpg";
  // @ts-expect-error Curved hero slot collection is readonly.
  curvedHeroCards.push(curvedHeroCards[0]);
  // @ts-expect-error Hero content is deeply readonly.
  heroSlides[0].title = "不可修改";
  // @ts-expect-error Hero capability labels are readonly.
  heroCapabilities[0] = "不可修改";
  // @ts-expect-error Audience labels are readonly.
  homeAudienceLabels.push("不可修改");
}

void assertReadonlyContentContracts;

describe("website content model", () => {
  it("locks the confirmed company identity and homepage positioning", () => {
    expect(company.name).toBe("北京首版认证有限公司");
    expect(company.shortName).toBe("首版认证");
    expect(company.heroTitle).toBe("首版认证｜AI时代IP权益基础设施");
    expect(company.seoTitle).toContain("数字人格权资产");
    expect(JSON.stringify(company)).not.toContain("北京首版科技有限公司");
  });

  it("keeps the first-phase navigation order", () => {
    expect(navigationItems.map((item) => item.href)).toEqual([
      "/",
      "/solutions",
      "/aipr",
      "/services",
      "/trust",
      "/compliance",
      "/about"
    ]);

    expect(navigationItems.map((item) => item.label)).toEqual([
      "首页",
      "解决方案",
      "星眸AIPR",
      "服务与产品",
      "技术与可信",
      "合规与研究",
      "关于首版与联系"
    ]);
  });

  it("keeps the upgraded seven-item primary navigation", () => {
    expect(navigationItems).toBe(primaryNavigation);
    expect(primaryNavigation.map((item) => item.href)).toEqual([
      "/",
      "/solutions",
      "/aipr",
      "/services",
      "/trust",
      "/compliance",
      "/about"
    ]);

    expect(new Set(primaryNavigation.map((item) => item.href)).size).toBe(
      primaryNavigation.length
    );
    expect(new Set(primaryNavigation.map((item) => item.label)).size).toBe(
      primaryNavigation.length
    );

    primaryNavigation.forEach((item) => {
      if ("menuKey" in item) {
        expect(megaMenus).toHaveProperty(item.menuKey);
      }
    });

    expectTypeOf(primaryNavigation.length).toEqualTypeOf<7>();
    expectTypeOf<
      (typeof primaryNavigation)[number]["href"]
    >().toMatchTypeOf<NavigationHref>();
  });

  it("provides two three-column mega menus", () => {
    expect(Object.keys(megaMenus)).toEqual(["services", "compliance"]);

    Object.values(megaMenus).forEach((menu) => {
      expect(menu.columns).toHaveLength(3);

      menu.columns.forEach((column) => {
        expect(column.title).toBeTruthy();
        expect(column.links.length).toBeGreaterThan(0);

        column.links.forEach((link) => {
          expect(link.href).toMatch(/^\/|^#/);
          expect(link.description).toBeTruthy();
          expect(routes).toContain(link.href.split("#")[0]);
        });
      });
    });

    expectTypeOf(megaMenus.services.columns.length).toEqualTypeOf<3>();
    expectTypeOf(megaMenus.compliance.columns.length).toEqualTypeOf<3>();
    expectTypeOf<
      (typeof megaMenus)[keyof typeof megaMenus]["columns"][number]["links"][number]["href"]
    >().toMatchTypeOf<NavigationHref>();
  });

  it("defines three local hero slides with complete actions", () => {
    expect(heroSlides).toHaveLength(3);
    expect(heroSlides[0].image).toBe("/images/hero/shouban-campus.jpg");
    expect(
      existsSync(join(process.cwd(), "public", heroSlides[0].image.slice(1)))
    ).toBe(true);
    expect(heroSlides.map((slide) => slide.description)).toEqual([
      "面向企业、平台与创作者，提供认证、确权、监测、维权与授权服务。",
      "围绕认证、监测、维权和授权，构建面向 AIGC 内容生态的可信服务体系。",
      "为企业、平台、机构和创作者提供可信认证、风险监测与合规研究支持。"
    ]);

    heroSlides.forEach((slide) => {
      expect(slide.title).toBeTruthy();
      expect(slide.description).toBeTruthy();
      expect(slide.primaryAction.href).toMatch(/^\//);
      expect(slide.secondaryAction.href).toMatch(/^\//);
      expect(routes).toContain(slide.primaryAction.href);
      expect(routes).toContain(slide.secondaryAction.href);
    });

    type ImageHeroSlide = Extract<HeroSlide, { visual: "image" }>;
    type MonitoringHeroSlide = Extract<HeroSlide, { visual: "monitoring" }>;
    type ComplianceHeroSlide = Extract<HeroSlide, { visual: "compliance" }>;

    expectTypeOf<ImageHeroSlide["image"]>().toEqualTypeOf<string>();
    expectTypeOf<MonitoringHeroSlide["image"]>().toEqualTypeOf<undefined>();
    expectTypeOf<ComplianceHeroSlide["image"]>().toEqualTypeOf<undefined>();
    expectTypeOf<
      (typeof heroSlides)[number]["primaryAction"]["href"]
    >().toMatchTypeOf<SiteRoute>();
    expectTypeOf<
      (typeof heroSlides)[number]["secondaryAction"]["href"]
    >().toMatchTypeOf<SiteRoute>();
  });

  it("fills all eight curved hero slots with unique local WebP images", () => {
    const expectedSources = [
      "/images/home/hero-campus.webp",
      "/images/home/hero-bpc.webp",
      "/images/home/hero-campus-courtyard.webp",
      "/images/home/hero-campus-corridor.webp",
      "/images/home/hero-campus-entrance.webp",
      "/images/home/hero-boardroom.webp",
      "/images/home/hero-auditorium.webp",
      "/images/home/hero-compliant-licensing.webp"
    ];
    const sources = curvedHeroCards.map(({ src }) => src);

    expect(curvedHeroCards).toHaveLength(8);
    expect(sources).toEqual(expectedSources);
    expect(new Set(sources)).toHaveProperty("size", 8);
    expect(curvedHeroCards.at(-1)?.alt).toBe(
      "首版认证版权服务会议室与业务交流空间"
    );
    expect(curvedHeroCards.slice(2, 7).map(({ alt }) => alt)).toEqual([
      "首版认证办公园区景观庭院",
      "首版认证办公园区玻璃连廊",
      "首版认证办公园区入口与旗阵",
      "首版认证商务会议与交流空间",
      "首版认证活动会议与发布空间"
    ]);

    curvedHeroCards.forEach(({ src, href, alt, aspect }) => {
      expect(src).not.toBeNull();
      expect(src).toMatch(/\.webp$/);
      expect(alt.trim()).not.toBe("");
      expect(href).toBeNull();
      expect(aspect).toBe(1.6);
      expect(
        existsSync(join(process.cwd(), "public", (src as string).slice(1)))
      ).toBe(true);
    });
  });

  it("defines the confirmed hero capabilities and service audiences", () => {
    expect(heroCapabilities).toEqual([
      "数字身份认证",
      "权益确权",
      "AIGC监测",
      "侵权维权",
      "合规授权"
    ]);
    expect(homeAudienceLabels).toEqual([
      "艺人",
      "创作者",
      "经纪机构",
      "品牌方",
      "平台企业",
      "AI公司"
    ]);
  });

  it("keeps the first-phase route surface", () => {
    expect(routes).toEqual([
      "/",
      "/solutions",
      "/aipr",
      "/services",
      "/trust",
      "/compliance",
      "/news",
      "/about",
      "/contact",
      "/privacy",
      "/disclaimer"
    ]);
  });

  it("contains the required content collections", () => {
    expect(customerScenarios).toHaveLength(4);
    expect(aiprModules).toHaveLength(5);
    expect(services).toHaveLength(6);
    expect(complianceTopics.length).toBeGreaterThanOrEqual(5);
    expect(researchItems.length).toBeGreaterThanOrEqual(5);
  });

  it("locks the required service product names and fields", () => {
    expect(services.map((service) => service.title)).toEqual([
      "数字人格权资产认证服务",
      "声音与声纹资产服务",
      "肖像与影像资产服务",
      "AIGC侵权监测服务",
      "证据固定与维权服务",
      "商业授权与合规使用服务"
    ]);

    services.forEach((service) => {
      expect(service.title).toBeTruthy();
      expect(service.description).toBeTruthy();
      expect(service.icon).toBeTruthy();
      expect(service.points.length).toBeGreaterThan(0);
    });
  });

  it("locks the required AIPR module names", () => {
    expect(aiprModules.map((module) => module.title)).toEqual([
      "数字人格权资产库",
      "AIGC侵权监测系统",
      "证据包与维权管理系统",
      "数字人格资产可信训练舱",
      "授权项目管理系统"
    ]);
  });

  it("supports research detail pages", () => {
    const firstResearchItem = researchItems[0];

    expect(getResearchItem(firstResearchItem.slug)).toBe(firstResearchItem);

    researchItems.forEach((item) => {
      expect(item.date).toBeTruthy();
      expect(item.summary).toBeTruthy();
      expect(item.body.length).toBeGreaterThan(0);
    });
  });

  it("contains the required legal pages", () => {
    expect(legalPages.privacy.title).toBe("隐私政策");
    expect(legalPages.privacy).toHaveProperty(
      "draftTitle",
      "隐私政策草案 / 尚未生效"
    );
    expect(legalPages.privacy.description).toContain("在线联系表单暂未开放");
    expect(legalPages.privacy.sections.length).toBeGreaterThanOrEqual(3);
    expect(JSON.stringify(legalPages.privacy)).not.toMatch(
      /待确认|privacy@|SMTP|腾讯云/
    );

    expect(legalPages.disclaimer).toEqual({
      title: "免责声明",
      description:
        "本网站第一阶段内容用于介绍首版认证的业务方向、服务产品和研究主题，不构成法律意见、投资建议或对特定结果的承诺。",
      sections: [
        "网站内容以公开展示和业务沟通为目的。",
        "未确认客户、资质、案例和数据不作展示。",
        "具体服务范围、交付方式和法律效果以正式协议及专业意见为准。"
      ]
    });
  });
});
