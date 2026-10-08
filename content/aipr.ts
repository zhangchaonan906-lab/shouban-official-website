import type { LucideIcon } from "lucide-react";
import {
  Archive,
  BadgeCheck,
  ClipboardList,
  FileSearch,
  FlaskConical,
  Handshake
} from "lucide-react";

export type AiprModule = {
  title: string;
  description: string;
  points: string[];
  icon: LucideIcon;
};

export type AiprPrinciple = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export const aiprPositioning = {
  name: "星眸AIPR",
  title: "数字人格权资产的认证、监测、维权与授权平台",
  description:
    "星眸AIPR面向AIGC时代的人格化IP权益保护，承接数字人格权资产库、侵权监测、证据包、可信训练舱和授权项目管理等基础能力。"
} as const;

export const aiprModules: AiprModule[] = [
  {
    title: "数字人格权资产库",
    description: "沉淀权利人、资产对象、权属说明、授权边界和业务记录。",
    points: ["资产档案", "权属说明", "授权边界"],
    icon: Archive
  },
  {
    title: "AIGC侵权监测系统",
    description: "发现生成式内容和线上传播场景中的疑似冒用、仿冒和未授权使用线索。",
    points: ["线索发现", "风险识别", "传播追踪"],
    icon: FileSearch
  },
  {
    title: "证据包与维权管理系统",
    description: "将侵权线索、页面信息、时间记录和授权状态整理为维权协同材料。",
    points: ["证据固定", "材料整理", "维权协同"],
    icon: ClipboardList
  },
  {
    title: "数字人格资产可信训练舱",
    description: "围绕AI训练、模型调用和素材使用边界建立可追溯的合规说明。",
    points: ["训练边界", "素材版本", "使用留痕"],
    icon: FlaskConical
  },
  {
    title: "授权项目管理系统",
    description: "管理商业授权项目、使用范围、期限、交付物和合作方合规要求。",
    points: ["项目台账", "范围管理", "合规复盘"],
    icon: Handshake
  }
];

export const aiprPrinciples = [
  {
    title: "可信登记",
    description: "先明确资产对象、权属来源和可使用边界，再进入监测、维权或授权流程。",
    icon: BadgeCheck
  },
  {
    title: "证据优先",
    description: "围绕可追溯记录和可交付材料组织业务，避免只停留在口径描述。",
    icon: ClipboardList
  },
  {
    title: "合规授权",
    description: "在AI训练、生成、传播和商业使用中保留授权范围、期限和用途记录。",
    icon: Handshake
  }
] satisfies AiprPrinciple[];
