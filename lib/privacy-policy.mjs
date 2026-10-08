function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  for (const nested of Object.values(value)) {
    deepFreeze(nested);
  }

  return Object.freeze(value);
}

const rightsCommitments = [
  "访问",
  "复制",
  "更正",
  "补充",
  "删除",
  "限制处理",
  "拒绝处理",
  "撤回同意",
  "要求解释",
  "投诉",
  "符合法定条件时请求转移"
];

const inquiryProcessingMethod =
  "用户主动填写，经同源 API 校验后通过纯文本企业邮件处理";

const collectionFields = [
  {
    key: "name",
    label: "姓名",
    requiredness: "必填",
    purpose: "识别询问人并进行业务沟通",
    processingMethod: inquiryProcessingMethod,
    retentionKind: "inquiry"
  },
  {
    key: "contactMethod",
    label: "手机号或邮箱",
    requiredness: "至少填写一项",
    purpose: "回复本次询问",
    processingMethod: inquiryProcessingMethod,
    retentionKind: "inquiry"
  },
  {
    key: "organization",
    label: "机构或工作室",
    requiredness: "选填",
    purpose: "了解机构背景",
    processingMethod: inquiryProcessingMethod,
    retentionKind: "inquiry"
  },
  {
    key: "customerType",
    label: "客户类型",
    requiredness: "必填",
    purpose: "选择沟通背景",
    processingMethod: inquiryProcessingMethod,
    retentionKind: "inquiry"
  },
  {
    key: "needType",
    label: "需求类型",
    requiredness: "必填",
    purpose: "分派服务流程",
    processingMethod: inquiryProcessingMethod,
    retentionKind: "inquiry"
  },
  {
    key: "assetType",
    label: "资产类型",
    requiredness: "必填",
    purpose: "分派专业方向",
    processingMethod: inquiryProcessingMethod,
    retentionKind: "inquiry"
  },
  {
    key: "platformUrl",
    label: "平台或链接",
    requiredness: "选填",
    purpose: "定位公开线索",
    processingMethod: inquiryProcessingMethod,
    retentionKind: "inquiry"
  },
  {
    key: "message",
    label: "需求描述",
    requiredness: "必填",
    purpose: "理解并回复需求",
    processingMethod: inquiryProcessingMethod,
    retentionKind: "inquiry"
  },
  {
    key: "technical",
    label: "请求ID及安全访问数据",
    requiredness: "自动产生",
    purpose: "投递核对、安全防护与故障排查",
    processingMethod: "服务器、托管产品及反向代理自动产生",
    retentionKind: "technical"
  }
];

const networkAndSecurityCategories = [
  "IP 地址",
  "请求时间",
  "请求路径",
  "HTTP 状态",
  "User-Agent",
  "安全规则结果"
];

export const PRIVACY_POLICY_CONSENT_CONTRACT = deepFreeze({
  sections: [
    { id: "controller", label: "处理者与联系方式" },
    { id: "submitted-data", label: "您提交的信息" },
    { id: "technical-data", label: "技术与安全数据" },
    { id: "processing-flow", label: "处理流程与目的" },
    { id: "processors", label: "服务提供方" },
    { id: "retention", label: "保存期限与删除" },
    { id: "rights", label: "您的权利" },
    { id: "security", label: "安全措施" },
    { id: "sensitive-and-children", label: "敏感信息与未成年人" },
    { id: "updates", label: "政策更新" }
  ],
  collectionFields,
  processing: {
    primaryPurpose: "回复业务询问并进行必要沟通",
    collectionNotice:
      "表单区分必填、至少填写一项和选填信息；未标记为必填的内容由您自行决定是否提供。",
    path: [
      "浏览器内存",
      "同源 API 内存校验",
      "纯文本邮件",
      "授权人员访问"
    ],
    method: "为回复本次询问而收集、校验并通过企业邮件处理",
    noWebsiteDatabase: "表单内容不写入网站数据库",
    noAdvertisingOrUnrelatedMarketing:
      "表单信息不用于广告画像或与本次询问无关的营销",
    priorNoticeForNewBasisOrConsent:
      "如后续处理需要新的法定基础或另行取得同意，我们会在处理前告知"
  },
  technicalData: {
    applicationLogs: {
      categories: ["requestId", "结果码", "HTTP 响应状态", "处理耗时"],
      exclusions: ["表单字段", "请求正文", "原始 SMTP 响应"],
      purpose: "投递核对、安全防护与故障排查"
    },
    reverseProxy: {
      categories: networkAndSecurityCategories,
      purpose: "安全防护与故障排查"
    },
    edgeOne: {
      categories: networkAndSecurityCategories,
      purpose: "边缘安全防护、限频与故障排查"
    }
  },
  retention: {
    inquiryLabel: "未转化咨询",
    formalRecordRule:
      "转为正式业务记录后，按合同约定及适用的法定义务留存",
    deletionRule: "保存期限届满或处理目的实现后删除",
    deletionException:
      "因履行法律义务、争议处理或提出、抗辩法律主张确需继续保存",
    restrictedUse: "只在必要范围和期限内限制使用",
    rightsRecordRule: "权利请求处理记录在结案后按规定期限删除"
  },
  rights: {
    commitments: rightsCommitments,
    verification:
      "为保护信息安全，我们可能需要核验请求人与所涉信息的关联",
    responseClock: "身份核验完成后起算",
    refusalNotice: "无法满足请求时告知原因与可用的救济渠道"
  },
  security: {
    commitments: [
      "按最小权限原则限制邮箱与运维访问",
      "传输通道使用 TLS",
      "将邮件凭据与代码隔离保存",
      "对邮件与运维管理账户启用多因素认证（MFA）",
      "应用日志不记录表单字段、请求正文或原始 SMTP 响应",
      "发生可能影响个人权益的安全事件时依法采取补救和通知措施"
    ]
  },
  children: {
    notice: "本表单不面向14周岁以下未成年人；请勿通过本表单提交未成年人个人信息。",
    discoveredDataAction:
      "如果发现通过本表单提交了14周岁以下未成年人的个人信息，我们将在核验后删除",
    legalRetentionException: "法律法规另有保存义务的除外"
  },
  updates: {
    notice: "我们将在本页标明政策版本和生效日期，并以适当方式通知政策更新",
    materialChangeTriggers: ["处理目的", "处理方式", "信息类别"],
    reconsent: "发生实质变化前，我们会重新告知，并依法重新取得同意"
  },
  sensitiveMaterialWarning:
    "请勿提交身份证件号码、财务或健康信息、原始声纹或肖像素材、案件秘密，以及未经授权的第三方个人信息。"
});

export const PRIVACY_POLICY_SECTIONS =
  PRIVACY_POLICY_CONSENT_CONTRACT.sections;

export const PRIVACY_COLLECTION_FIELDS =
  PRIVACY_POLICY_CONSENT_CONTRACT.collectionFields;

export const PUBLIC_PRIVACY_POLICY = deepFreeze({
  version: "1.0",
  processorName: "北京首版认证有限公司",
  unconvertedInquiryRetentionDays: 180,
  applicationLogRetentionDays: 30,
  rightsRecordRetentionDays: 180,
  rightsResponseWorkingDays: 15,
  childAgeThreshold: 14,
  rightsCommitments: PRIVACY_POLICY_CONSENT_CONTRACT.rights.commitments
});

export const SENSITIVE_MATERIAL_WARNING =
  PRIVACY_POLICY_CONSENT_CONTRACT.sensitiveMaterialWarning;

export const CHILD_CONTACT_NOTICE =
  PRIVACY_POLICY_CONSENT_CONTRACT.children.notice;
