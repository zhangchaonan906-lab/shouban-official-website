export type TrustTopic = {
  readonly title: string;
  readonly description: string;
  readonly points: readonly string[];
};

export const trustIntro = {
  eyebrow: "技术与可信",
  title: "把可信建立在可追溯记录、人工复核与清晰边界上",
  description:
    "公开说明资产记录、风险线索、证据材料、授权与数据处理的工作原则。技术输出用于业务判断与协同，不替代司法认定或专业法律意见。"
} as const;

export const trustTopics = [
  {
    title: "资产对象与来源记录",
    description: "围绕姓名、肖像、声音、影像和数字分身记录对象、材料来源、提交主体与必要说明。",
    points: ["对象结构化", "来源可说明", "记录可回溯"]
  },
  {
    title: "疑似线索与人工复核",
    description: "将技术发现作为风险线索入口，并结合页面、主体、传播方式和授权状态进行人工核对。",
    points: ["线索初筛", "人工核对", "风险分层"]
  },
  {
    title: "证据材料分层组织",
    description: "按页面信息、时间记录、内容表现和授权状态整理材料，便于后续沟通和专业协同。",
    points: ["材料分类", "时间线整理", "交付范围说明"]
  },
  {
    title: "授权范围与使用留痕",
    description: "围绕项目、期限、渠道、素材版本和用途记录授权边界，为合作复盘提供清晰依据。",
    points: ["范围记录", "版本关联", "过程留痕"]
  },
  {
    title: "数据最小化与权限边界",
    description: "按具体服务需要确认数据范围、访问角色和保存方式，未具备条件的收集能力保持关闭。",
    points: ["最小必要", "角色控制", "状态透明"]
  },
  {
    title: "能力状态与结论边界",
    description: "区分当前可提供的服务、项目化能力与规划方向，避免把技术线索表达为确定法律结论。",
    points: ["状态分层", "结论克制", "按项目确认"]
  }
] as const satisfies readonly TrustTopic[];

export const trustBoundaries = [
  "疑似风险线索不等于侵权认定，具体判断需结合事实、授权材料与适用规则。",
  "材料整理不等于公证、司法鉴定或法律意见，相关事项应由有权机构或专业人士完成。",
  "监测范围、数据来源、处理方式与保存安排以具体项目确认及有效隐私文件为准。",
  "规划中的能力不写作已经上线；未经核验的客户、资质、指标和合作关系不对外展示。"
] as const;
