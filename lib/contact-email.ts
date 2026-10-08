import type { ContactFormValues } from "./contact";

export type ContactEmail = {
  subject: string;
  text: string;
};

export type ContactEmailServerContext = {
  requestId: string;
  receivedAt: string;
  privacyPolicyVersion: string;
  privacyPolicyEffectiveDate: string;
  privacyPolicySnapshotId: string;
};

function optionalValue(value: string) {
  return value.trim() || "未填写";
}

export function buildContactEmail(
  values: ContactFormValues,
  context: ContactEmailServerContext
): ContactEmail {
  return {
    subject: `首版认证官网需求：${values.needType.trim()}`,
    text: [
      "首版认证官网收到新的联系表单提交。",
      "",
      `请求 ID：${context.requestId}`,
      `服务端接收时间：${context.receivedAt}`,
      `隐私政策版本：${context.privacyPolicyVersion}`,
      `隐私政策生效日期：${context.privacyPolicyEffectiveDate}`,
      `隐私政策快照 ID：${context.privacyPolicySnapshotId}`,
      "",
      `姓名：${values.name}`,
      `手机号：${optionalValue(values.phone)}`,
      `机构：${optionalValue(values.organization)}`,
      `邮箱：${optionalValue(values.email)}`,
      `客户类型：${values.customerType}`,
      `需求类型：${values.needType}`,
      `资产类型：${values.assetType}`,
      `平台或链接：${optionalValue(values.platformUrl)}`,
      "用户确认：已阅读隐私政策并同意为回复本次询问处理本次提交信息",
      "",
      `需求描述：${values.message}`
    ].join("\n")
  };
}
