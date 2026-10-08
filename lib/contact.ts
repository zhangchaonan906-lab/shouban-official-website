export const customerTypes = [
  "艺人/公众人物/工作室",
  "品牌/经纪公司",
  "平台/内容机构",
  "法律/版权服务机构",
  "其他"
] as const;

export const contactNeedTypes = [
  "申请数字人格权资产体检",
  "咨询数字人格权资产确权",
  "处理AI仿冒或侵权线索",
  "了解证据固定流程",
  "企业合作咨询"
] as const;

export const assetTypes = [
  "声音声纹",
  "肖像形象",
  "姓名艺名",
  "视频片段",
  "综合数字人格权资产"
] as const;

export type ContactFormValues = {
  name: string;
  phone: string;
  organization: string;
  email: string;
  customerType: string;
  needType: string;
  assetType: string;
  platformUrl: string;
  message: string;
  consent: boolean;
};

export type ContactFormErrorKey = keyof ContactFormValues | "contactMethod";

export type ContactFormErrors = Partial<Record<ContactFormErrorKey, string>>;

export type ContactPolicySubmissionMetadata = {
  privacyPolicyVersion: string;
  privacyPolicyEffectiveDate: string;
  privacyPolicySnapshotId: string;
};

export type ContactValidationResult = {
  success: boolean;
  errors: ContactFormErrors;
};

export const contactFieldLimits = {
  name: 50,
  phone: 32,
  organization: 120,
  email: 254,
  customerType: 40,
  needType: 80,
  assetType: 40,
  platformUrl: 2048,
  message: 2000,
  website: 200
} as const;

export const contactPolicyMetadataLimits = {
  version: 32,
  effectiveDate: 10,
  snapshotId: 64
} as const;

const contactFieldLabels = {
  name: "姓名",
  phone: "手机号",
  organization: "机构或工作室名称",
  email: "邮箱",
  customerType: "客户类型",
  needType: "需求类型",
  assetType: "资产类型",
  platformUrl: "平台或链接",
  message: "需求描述"
} as const satisfies Record<Exclude<keyof ContactFormValues, "consent">, string>;

const phonePattern = /^1[3-9]\d{9}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateContactForm(values: ContactFormValues): ContactValidationResult {
  const errors: ContactFormErrors = {};
  const normalized = {
    name: values.name.trim(),
    phone: values.phone.trim(),
    organization: values.organization.trim(),
    email: values.email.trim(),
    customerType: values.customerType.trim(),
    needType: values.needType.trim(),
    assetType: values.assetType.trim(),
    platformUrl: values.platformUrl.trim(),
    message: values.message.trim()
  };

  for (const field of Object.keys(normalized) as Array<keyof typeof normalized>) {
    const limit = contactFieldLimits[field];

    if (values[field].length > limit) {
      errors[field] = `${contactFieldLabels[field]}不能超过 ${limit} 个字符`;
    }
  }

  if (!normalized.name) {
    errors.name = "请填写姓名";
  }

  if (!normalized.phone && !normalized.email) {
    errors.contactMethod = "请至少填写手机号或邮箱中的一项";
  }

  if (!errors.phone && normalized.phone && !phonePattern.test(normalized.phone)) {
    errors.phone = "请填写有效的中国大陆手机号";
  }

  if (!errors.email && normalized.email && !emailPattern.test(normalized.email)) {
    errors.email = "请填写有效邮箱";
  }

  if (!errors.customerType && !customerTypes.includes(normalized.customerType as (typeof customerTypes)[number])) {
    errors.customerType = "请选择客户类型";
  }

  if (!errors.needType && !contactNeedTypes.includes(normalized.needType as (typeof contactNeedTypes)[number])) {
    errors.needType = "请选择需求类型";
  }

  if (!errors.assetType && !assetTypes.includes(normalized.assetType as (typeof assetTypes)[number])) {
    errors.assetType = "请选择资产类型";
  }

  if (!errors.platformUrl && normalized.platformUrl && !isHttpUrl(normalized.platformUrl)) {
    errors.platformUrl = "请填写有效的 http 或 https 链接";
  }

  if (!errors.message && normalized.message.length < 10) {
    errors.message = "请至少填写 10 个字的需求描述";
  }

  if (values.consent !== true) {
    errors.consent = "请确认同意我们联系并处理本次提交信息";
  }

  return {
    success: Object.keys(errors).length === 0,
    errors
  };
}
