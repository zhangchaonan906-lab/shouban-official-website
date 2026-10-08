import type { SiteRoute } from "../lib/constants";

export type HeroAction = {
  readonly label: string;
  readonly href: SiteRoute;
};

export type HeroSlideBase = {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly primaryAction: HeroAction;
  readonly secondaryAction: HeroAction;
};

export type HeroImageSlide = HeroSlideBase & {
  readonly visual: "image";
  readonly image: string;
};

export type HeroMonitoringSlide = HeroSlideBase & {
  readonly visual: "monitoring";
  readonly image?: never;
};

export type HeroComplianceSlide = HeroSlideBase & {
  readonly visual: "compliance";
  readonly image?: never;
};

export type HeroSlide =
  | HeroImageSlide
  | HeroMonitoringSlide
  | HeroComplianceSlide;

export const heroSlides = [
  {
    eyebrow: "北京首版认证有限公司",
    title: "AIGC 时代的数字人格权资产认证服务",
    description:
      "面向企业、平台与创作者，提供认证、确权、监测、维权与授权服务。",
    image: "/images/hero/shouban-campus.jpg",
    visual: "image",
    primaryAction: { label: "了解星眸AIPR", href: "/aipr" },
    secondaryAction: { label: "联系我们", href: "/contact" }
  },
  {
    eyebrow: "星眸AIPR",
    title: "星眸AIPR：让数字人格权资产可识别、可追踪、可保护",
    description:
      "围绕认证、监测、维权和授权，构建面向 AIGC 内容生态的可信服务体系。",
    visual: "monitoring",
    primaryAction: { label: "查看服务产品", href: "/services" },
    secondaryAction: { label: "了解合规研究", href: "/compliance" }
  },
  {
    eyebrow: "合规基础设施",
    title: "面向未来内容生态的合规基础设施",
    description:
      "为企业、平台、机构和创作者提供可信认证、风险监测与合规研究支持。",
    visual: "compliance",
    primaryAction: { label: "查看合规研究", href: "/compliance" },
    secondaryAction: { label: "新闻与研究", href: "/news" }
  }
] as const satisfies readonly HeroSlide[];

export type CurvedHeroCard = {
  readonly id: string;
  readonly src: string | null;
  readonly alt: string;
  readonly href: SiteRoute | null;
  readonly aspect: 1.6;
};

const curvedHeroAssets = [
  {
    src: "/images/home/hero-campus.webp",
    alt: "首版认证办公园区外景"
  },
  {
    src: "/images/home/hero-bpc.webp",
    alt: "北京市出版版权协会展示墙"
  },
  {
    src: "/images/home/hero-campus-courtyard.webp",
    alt: "首版认证办公园区景观庭院"
  },
  {
    src: "/images/home/hero-campus-corridor.webp",
    alt: "首版认证办公园区玻璃连廊"
  },
  {
    src: "/images/home/hero-campus-entrance.webp",
    alt: "首版认证办公园区入口与旗阵"
  },
  {
    src: "/images/home/hero-boardroom.webp",
    alt: "首版认证商务会议与交流空间"
  },
  {
    src: "/images/home/hero-auditorium.webp",
    alt: "首版认证活动会议与发布空间"
  },
  {
    src: "/images/home/hero-compliant-licensing.webp",
    alt: "首版认证版权服务会议室与业务交流空间"
  }
] as const;

export const curvedHeroCards: readonly CurvedHeroCard[] = curvedHeroAssets.map(
  (asset, index) => ({
    id: `curved-hero-${index + 1}`,
    src: asset.src,
    alt: asset.alt,
    href: null,
    aspect: 1.6 as const
  })
);

export const heroCapabilities = [
  "数字身份认证",
  "权益确权",
  "AIGC监测",
  "侵权维权",
  "合规授权"
] as const;

export const homeAudienceLabels = [
  "艺人",
  "创作者",
  "经纪机构",
  "品牌方",
  "平台企业",
  "AI公司"
] as const;
