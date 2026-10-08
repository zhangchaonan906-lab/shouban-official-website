export type ResearchItem = {
  slug: string;
  title: string;
  date: string;
  summary: string;
  description: string;
  body: string[];
  category: string;
};

export const researchItems: ResearchItem[] = [
  {
    slug: "digital-personality-assets",
    title: "数字人格权资产的对象识别与管理框架",
    date: "2026-07-01",
    summary: "梳理姓名、肖像、声音、形象与数字分身在AIGC业务中的资产化管理路径。",
    description: "梳理姓名、肖像、声音、形象与数字分身在AIGC业务中的资产化管理路径。",
    body: [
      "数字人格权资产需要先明确权利主体、人格标识类型、素材来源、使用场景和授权边界。",
      "首版认证第一阶段将其表达为可登记、可监测、可维权、可授权的业务对象，为星眸AIPR后续模块承接打基础。"
    ],
    category: "权利框架"
  },
  {
    slug: "aigc-infringement-monitoring",
    title: "AIGC侵权监测的线索类型与证据组织",
    date: "2026-07-02",
    summary: "总结生成式内容传播环境下的疑似侵权线索、风险分级和证据包结构。",
    description: "总结生成式内容传播环境下的疑似侵权线索、风险分级和证据包结构。",
    body: [
      "AIGC侵权监测需要覆盖未授权合成、形象仿冒、声音克隆、商业投放和平台传播等常见线索。",
      "证据组织应记录页面位置、发布时间、传播路径、疑似使用方式和已有授权状态，便于后续维权协同。"
    ],
    category: "监测维权"
  },
  {
    slug: "voice-and-voiceprint-compliance",
    title: "声音与声纹资产的授权边界",
    date: "2026-07-03",
    summary: "关注AI语音合成、声音克隆和商业配音场景中的授权、留痕和撤回机制。",
    description: "关注AI语音合成、声音克隆和商业配音场景中的授权、留痕和撤回机制。",
    body: [
      "声音与声纹资产服务应区分样本采集、模型训练、语音生成、商业发布和二次传播等不同环节。",
      "授权记录需要明确用途、期限、渠道、合作方和撤回机制，避免AI语音能力被超范围使用。"
    ],
    category: "声音声纹"
  },
  {
    slug: "portrait-digital-human-licensing",
    title: "肖像影像与数字人授权的合规要点",
    date: "2026-07-04",
    summary: "围绕数字分身、虚拟直播、广告投放和品牌合作梳理授权管理事项。",
    description: "围绕数字分身、虚拟直播、广告投放和品牌合作梳理授权管理事项。",
    body: [
      "肖像影像资产需要关注素材来源、拍摄授权、数字形象生成、商业投放和跨平台传播的连续记录。",
      "数字人项目应把形象授权、脚本内容、声音使用、投放渠道和合作期限纳入同一项目台账。"
    ],
    category: "肖像影像"
  },
  {
    slug: "trusted-training-room",
    title: "数字人格资产可信训练舱的业务边界",
    date: "2026-07-05",
    summary: "讨论人格化素材进入AI训练、微调和应用调用时的权属说明与使用记录。",
    description: "讨论人格化素材进入AI训练、微调和应用调用时的权属说明与使用记录。",
    body: [
      "可信训练舱的核心不是承诺模型效果，而是记录人格化素材进入训练、微调和调用链路的合规边界。",
      "后续详情页可围绕素材版本、训练目的、授权范围、调用记录和退出机制展开说明。"
    ],
    category: "可信训练"
  }
];

export function getResearchItem(slug: string) {
  return researchItems.find((item) => item.slug === slug);
}
