import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  BarChart3,
  Blocks,
  Building2,
  DatabaseZap,
  FileCheck2,
  Fingerprint,
  Gavel,
  Landmark,
  Network,
  ShieldCheck,
  Sparkles,
  UserCheck
} from "lucide-react";
import { primaryNavigation } from "./navigation";

export type { NavigationItem } from "./navigation";

export type CapabilityOverview = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export type ProcessStep = {
  step: string;
  title: string;
  description: string;
};

export const company = {
  name: "北京首版认证有限公司",
  shortName: "首版认证",
  tagline: "AIGC时代数字人格权资产基础设施",
  heroTitle: "首版认证｜AI时代IP权益基础设施",
  heroDescription:
    "首版认证面向AIGC时代的人格化IP、声音、肖像、形象与内容资产，提供数字人格权资产的认证、确权、监测、维权与授权基础能力。星眸AIPR作为核心平台，帮助权利人、机构与品牌建立可识别、可追溯、可管理、可合规使用的数字人格资产体系。",
  description:
    "北京首版认证有限公司聚焦数字人格权资产服务，围绕人格标识、声音声纹、肖像影像、AIGC生成内容与商业授权场景，建设可信认证、侵权监测、证据固定、维权协同和授权管理能力。",
  seoTitle: "北京首版认证有限公司｜数字人格权资产认证、监测、维权与授权基础设施",
  seoDescription:
    "首版认证聚焦AIGC时代数字人格权资产，提供认证确权、AIGC侵权监测、证据固定、维权协同、可信训练与商业授权合规使用服务。",
  keywords: [
    "北京首版认证有限公司",
    "首版认证",
    "星眸AIPR",
    "数字人格权资产",
    "AI时代IP权益基础设施",
    "AIGC侵权监测",
    "声音声纹资产",
    "肖像影像资产",
    "数字人格授权",
    "证据固定",
    "人格权保护"
  ],
  contact: {
    phone: "待公司确认",
    email: "待公司确认",
    address: "待公司确认",
    recordNumber: "待公司确认"
  }
} as const;

export const navigationItems = primaryNavigation;

export const customerScenarios: CapabilityOverview[] = [
  {
    title: "艺人、创作者与公众人物",
    description: "为声音、肖像、姓名、形象与数字分身建立资产档案，支持后续监测、维权和授权管理。",
    icon: UserCheck
  },
  {
    title: "经纪公司与内容机构",
    description: "统一管理旗下IP与人格化素材，沉淀权属、授权、使用范围和侵权线索。",
    icon: Building2
  },
  {
    title: "品牌方与商业合作方",
    description: "在广告、短视频、直播、智能客服和生成式内容中降低人格权与IP使用风险。",
    icon: BadgeCheck
  },
  {
    title: "平台、园区与行业组织",
    description: "为AIGC内容生态建立可信登记、监测协同、证据治理和合规服务能力。",
    icon: Landmark
  }
];

export const serviceFlow: ProcessStep[] = [
  {
    step: "01",
    title: "资产识别",
    description: "梳理姓名、肖像、声音、声纹、形象、作品和数字分身等人格化IP权益对象。"
  },
  {
    step: "02",
    title: "认证确权",
    description: "建立资产档案、权属说明、授权边界、证据留存和可信时间线。"
  },
  {
    step: "03",
    title: "监测取证",
    description: "围绕AIGC生成、传播和商业使用场景持续发现风险线索并形成证据包。"
  },
  {
    step: "04",
    title: "维权授权",
    description: "支持维权协同、授权项目管理、合规使用留痕和资产价值转化。"
  }
];

export const capabilityOverview: CapabilityOverview[] = [
  {
    title: "数字人格权资产认证",
    description: "把声音、肖像、形象、姓名和数字分身纳入可管理、可追溯的资产档案。",
    icon: Fingerprint
  },
  {
    title: "AIGC侵权监测",
    description: "面向生成式内容、短视频、社交平台和商业投放场景发现疑似侵权线索。",
    icon: ShieldCheck
  },
  {
    title: "证据固定与维权协同",
    description: "将线索、页面、时间、使用方式和授权状态整理为可交付的证据包。",
    icon: FileCheck2
  },
  {
    title: "授权与合规使用",
    description: "支持项目化授权、使用范围管理、素材合规审查和训练数据边界说明。",
    icon: Network
  }
];

export const valuePoints: CapabilityOverview[] = [
  {
    title: "权利对象更清晰",
    description: "从传统作品版权扩展到人格标识、声音声纹、肖像影像和数字分身等资产对象。",
    icon: Sparkles
  },
  {
    title: "证据链条更完整",
    description: "围绕认证、监测、取证、维权和授权沉淀持续可查的业务记录。",
    icon: DatabaseZap
  },
  {
    title: "业务落地更克制",
    description: "第一阶段官网只展示可信内容和文本表单，不接入后台、上传、验证码或CMS。",
    icon: Blocks
  },
  {
    title: "表达边界更合规",
    description: "未确认的客户、资质、数据和联系方式均使用占位或类型化描述。",
    icon: Gavel
  }
];

export const serviceProcess = serviceFlow;

export const homeStats = [
  { label: "客户场景", value: "4类", note: "覆盖个人、机构、品牌与平台组织" },
  { label: "服务产品", value: "6项", note: "认证、监测、维权、授权一体化" },
  { label: "核心平台", value: "星眸AIPR", note: "数字人格权资产基础能力" }
] as const;

export const visualKeywords = [
  "数字人格权资产",
  "星眸AIPR",
  "AIGC侵权监测",
  "证据固定",
  "可信训练",
  "商业授权"
] as const;

export const complianceNotes = [
  "不展示未经确认的客户名称、资质证书或具体业务数据。",
  "案例与成果仅使用类型化描述，待内部确认后再替换为真实案例。",
  "联系方式暂以占位符呈现，避免误导访客。",
  "第一阶段仅提供静态内容与文本表单，不接入CMS、上传、验证码或流程后台。"
] as const;

export const pageIntros = {
  about: {
    eyebrow: "关于首版与联系",
    title: "面向AIGC时代的数字人格权资产服务机构",
    description:
      "首版认证聚焦数字人格权资产认证、确权、监测、维权和授权基础设施建设，第一阶段官网以可信表达和清晰服务边界为核心。"
  },
  services: {
    eyebrow: "服务与产品",
    title: "围绕数字人格权资产全生命周期的六类服务",
    description:
      "从资产识别、认证确权到AIGC侵权监测、证据固定、维权协同和商业授权，形成可落地的服务组合。"
  },
  compliance: {
    eyebrow: "合规与研究",
    title: "持续关注AIGC与数字人格权资产的合规边界",
    description:
      "围绕人格权、著作权、数据合规、平台治理和生成式AI使用边界，沉淀可供业务落地参考的研究主题。"
  },
  aipr: {
    eyebrow: "星眸AIPR",
    title: "数字人格权资产的认证、监测、维权与授权平台",
    description:
      "星眸AIPR承载资产库、侵权监测、证据包、可信训练舱和授权项目管理等核心模块。"
  },
  news: {
    eyebrow: "研究动态",
    title: "关注AIGC、人格权与IP权益基础设施",
    description: "发布行业观察、合规研究和公司能力动态，重大事实确认后再对外披露。"
  },
  contact: {
    eyebrow: "联系我们",
    title: "欢迎沟通数字人格权资产服务需求",
    description:
      "请留下基础信息和需求类型。第一阶段仅提供文本表单与企业邮箱后续对接，不接入附件上传、CMS、验证码或流程后台。"
  }
} as const;

export const aboutMilestones: CapabilityOverview[] = [
  {
    title: "聚焦数字人格权资产",
    description: "将人格标识、声音声纹、肖像影像和数字分身纳入可认证、可管理的权益对象。",
    icon: UserCheck
  },
  {
    title: "建设星眸AIPR平台",
    description: "以资产库、监测系统、证据包、可信训练舱和授权管理支撑业务落地。",
    icon: BarChart3
  },
  {
    title: "坚持可信官网第一阶段",
    description: "优先完成7天可信落地页、静态内容和文本表单，暂不接入复杂后台。",
    icon: ShieldCheck
  }
];
