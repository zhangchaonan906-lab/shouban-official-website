import type { SiteRoute } from "../lib/constants";

export type MegaMenuKey = "services" | "compliance";

export type NavigationHref = SiteRoute | `${SiteRoute}#${string}`;

type NavigationItemBase = {
  readonly label: string;
  readonly href: NavigationHref;
  readonly activeHrefs?: readonly SiteRoute[];
};

export type NavigationLinkItem = NavigationItemBase & {
  readonly menuKey?: never;
};

export type NavigationMenuItem = NavigationItemBase & {
  readonly menuKey: MegaMenuKey;
};

export type NavigationItem = NavigationLinkItem | NavigationMenuItem;

export type MegaMenuLink = {
  readonly label: string;
  readonly href: NavigationHref;
  readonly description: string;
};

export type MegaMenuColumn = {
  readonly title: string;
  readonly links: readonly MegaMenuLink[];
};

export type MegaMenuGroup = {
  readonly label: string;
  readonly columns: readonly [
    MegaMenuColumn,
    MegaMenuColumn,
    MegaMenuColumn
  ];
};

export const primaryNavigation = [
  { label: "首页", href: "/" },
  { label: "解决方案", href: "/solutions" },
  { label: "星眸AIPR", href: "/aipr" },
  { label: "服务与产品", href: "/services", menuKey: "services" },
  { label: "技术与可信", href: "/trust" },
  {
    label: "合规与研究",
    href: "/compliance",
    menuKey: "compliance",
    activeHrefs: ["/compliance", "/news"]
  },
  {
    label: "关于首版与联系",
    href: "/about",
    activeHrefs: ["/about", "/contact"]
  }
] as const satisfies readonly NavigationItem[];

export const secondaryNavigation = [
  { label: "新闻与研究", href: "/news" },
  { label: "联系我们", href: "/contact" }
] as const satisfies readonly NavigationLinkItem[];

export const megaMenus = {
  services: {
    label: "服务与产品",
    columns: [
      {
        title: "资产认证类",
        links: [
          {
            label: "数字人格权资产认证",
            href: "/services",
            description: "建立数字人格权资产的可信认证记录与权属档案。"
          },
          {
            label: "声音声纹资产",
            href: "/services",
            description: "梳理声音样本、声纹特征、授权边界与使用场景。"
          },
          {
            label: "肖像影像资产",
            href: "/services",
            description: "管理肖像、影像与数字形象的资产记录和授权范围。"
          }
        ]
      },
      {
        title: "监测维权类",
        links: [
          {
            label: "AIGC侵权监测",
            href: "/services",
            description: "发现生成内容与传播场景中的疑似侵权线索。"
          },
          {
            label: "证据固定与维权",
            href: "/services",
            description: "整理页面、时间与授权状态，形成可交付证据材料。"
          }
        ]
      },
      {
        title: "协同入口",
        links: [
          {
            label: "查看全部服务",
            href: "/services",
            description: "了解认证、监测、维权与授权的完整服务组合。"
          },
          {
            label: "联系咨询",
            href: "/contact",
            description: "沟通数字人格权资产服务需求与合作场景。"
          }
        ]
      }
    ]
  },
  compliance: {
    label: "合规与研究",
    columns: [
      {
        title: "研究方向",
        links: [
          {
            label: "数字人格权资产",
            href: "/compliance",
            description: "研究姓名、肖像、声音与数字分身的权益边界。"
          },
          {
            label: "AIGC内容治理",
            href: "/compliance",
            description: "关注生成内容识别、平台治理与商业使用风险。"
          }
        ]
      },
      {
        title: "研究内容",
        links: [
          {
            label: "声音与声纹合规",
            href: "/compliance",
            description: "梳理AI语音、声纹克隆与样本管理的合规要求。"
          },
          {
            label: "肖像影像与授权",
            href: "/compliance",
            description: "研究数字形象、虚拟直播与广告投放的授权边界。"
          }
        ]
      },
      {
        title: "公开入口",
        links: [
          {
            label: "查看合规研究",
            href: "/compliance",
            description: "浏览面向业务落地的合规研究主题。"
          },
          {
            label: "新闻与研究",
            href: "/news",
            description: "查看行业观察、研究文章与公司公开动态。"
          }
        ]
      }
    ]
  }
} as const satisfies Record<MegaMenuKey, MegaMenuGroup>;
