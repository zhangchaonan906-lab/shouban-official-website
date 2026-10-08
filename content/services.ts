import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Camera,
  FileSearch,
  Handshake,
  Mic2,
  ShieldAlert
} from "lucide-react";

export type Service = {
  title: string;
  summary: string;
  description: string;
  points: string[];
  icon: LucideIcon;
};

export const services: Service[] = [
  {
    title: "数字人格权资产认证服务",
    summary: "为姓名、肖像、声音、形象、数字分身等人格化IP建立可信资产档案。",
    description:
      "面向个人权利人、经纪机构和内容组织，梳理数字人格权资产对象、权属说明、授权边界和证据材料，形成可持续管理的认证记录。",
    points: ["资产对象识别", "权属材料整理", "可信档案建立"],
    icon: BadgeCheck
  },
  {
    title: "声音与声纹资产服务",
    summary: "围绕声音样本、声纹特征、授权边界和AI语音使用场景建立管理基础。",
    description:
      "支持声音与声纹类资产的登记、说明、授权范围记录和风险线索整理，为AI语音合成、数字人和商业内容使用提供合规依据。",
    points: ["声音样本归档", "声纹权益说明", "AI语音使用边界"],
    icon: Mic2
  },
  {
    title: "肖像与影像资产服务",
    summary: "面向肖像、影像、虚拟形象和数字分身建立资产化管理与授权说明。",
    description:
      "帮助权利人和机构整理肖像影像素材、数字形象使用范围、商业合作记录和授权限制，降低AIGC传播环境下的滥用风险。",
    points: ["肖像素材管理", "数字形象授权", "使用场景记录"],
    icon: Camera
  },
  {
    title: "AIGC侵权监测服务",
    summary: "持续发现生成式内容、短视频、社交平台和商业投放中的疑似侵权线索。",
    description:
      "围绕数字人格权资产的线上传播与生成式使用场景，监测疑似冒用、仿冒、未授权合成和商业化使用风险。",
    points: ["疑似侵权发现", "传播线索整理", "风险分级提示"],
    icon: ShieldAlert
  },
  {
    title: "证据固定与维权服务",
    summary: "将侵权线索、页面信息、时间记录和授权状态整理为可交付证据包。",
    description:
      "为后续沟通、投诉、律师协同或平台处置提供证据固定与材料整理支持，提升数字人格权资产维权效率。",
    points: ["页面证据留存", "证据包整理", "维权协同支持"],
    icon: FileSearch
  },
  {
    title: "商业授权与合规使用服务",
    summary: "支持品牌合作、内容投放、AI训练和数字人项目中的授权管理与使用留痕。",
    description:
      "围绕授权项目、使用范围、素材版本、期限限制和合规要求，帮助合作方建立可查、可控、可复盘的商业使用流程。",
    points: ["授权项目管理", "使用范围留痕", "合规审查支持"],
    icon: Handshake
  }
];
