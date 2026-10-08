export type Solution = {
  readonly id: string;
  readonly title: string;
  readonly audience: string;
  readonly description: string;
  readonly capabilities: readonly string[];
};

export const solutionsIntro = {
  eyebrow: "解决方案",
  title: "按角色与使用场景理解可组合的服务路径",
  description:
    "面向权利人、机构、品牌、平台与行业组织，梳理数字人格权资产相关需求；具体范围、材料、流程与结果以项目确认及正式协议为准。"
} as const;

export const solutions = [
  {
    id: "rights-holders",
    audience: "权利人与经纪机构",
    title: "个人声像与数字分身管理",
    description:
      "围绕姓名、肖像、声音、形象和数字分身梳理权益对象、现有材料与使用边界，为后续认证、监测和授权协同建立基础记录。",
    capabilities: ["权益对象梳理", "权属与授权材料整理", "疑似使用线索归集"]
  },
  {
    id: "creators",
    audience: "创作者与MCN机构",
    title: "内容生产与商业合作边界",
    description:
      "面向短视频、直播、配音和生成式内容场景，记录素材来源、合作范围与使用限制，支持团队形成可复盘的内容管理方式。",
    capabilities: ["内容素材归档", "合作边界记录", "风险线索协同"]
  },
  {
    id: "brands",
    audience: "品牌与消费品企业",
    title: "营销素材与授权使用管理",
    description:
      "针对广告、社交传播、数字人和AI生成素材，梳理人格化IP的来源、授权范围与投放场景，降低未明确使用带来的业务风险。",
    capabilities: ["营销场景识别", "授权范围核对", "使用过程留痕"]
  },
  {
    id: "culture-ip",
    audience: "文化IP与内容机构",
    title: "IP素材与数字形象治理",
    description:
      "围绕角色形象、声音、影像和衍生内容建立结构化记录，支持跨项目的素材管理、疑似侵权线索整理与授权协同。",
    capabilities: ["IP素材分层", "数字形象记录", "项目授权协同"]
  },
  {
    id: "platforms-ai",
    audience: "平台与AI企业",
    title: "生成式应用与平台协同",
    description:
      "结合产品形态和内容流转路径，梳理人格化素材进入生成、传播和商业使用环节时的权利提示、线索处理与协同需求。",
    capabilities: ["应用场景梳理", "线索处理规则", "协同接口规划"]
  },
  {
    id: "industry-governance",
    audience: "行业治理与专业机构",
    title: "行业规则与服务协同",
    description:
      "面向园区、协会及专业服务组织，梳理数字人格权资产相关的服务对象、工作流程和公开表达边界，支持类型化合作沟通。",
    capabilities: ["服务对象分类", "工作流程共建", "公开边界说明"]
  }
] as const satisfies readonly Solution[];
