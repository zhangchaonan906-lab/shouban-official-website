import { describe, expect, expectTypeOf, it } from "vitest";
import {
  buildContactEmail,
  type ContactEmailServerContext
} from "../lib/contact-email";
import {
  assetTypes,
  contactFieldLimits,
  contactNeedTypes,
  contactPolicyMetadataLimits,
  customerTypes,
  type ContactFormErrorKey,
  type ContactFormErrors,
  type ContactFormValues,
  type ContactPolicySubmissionMetadata,
  validateContactForm
} from "../lib/contact";

const validValues: ContactFormValues = {
  name: "王女士",
  phone: "13800138000",
  organization: "某艺人工作室",
  email: "contact@example.com",
  customerType: "艺人/公众人物/工作室",
  needType: "申请数字人格权资产体检",
  assetType: "声音声纹",
  platformUrl: "https://example.com/risk-video",
  message: "希望评估AI声音克隆和短视频冒用风险，并了解证据固定流程。",
  consent: true
};

const emailServerContext = {
  requestId: "123e4567-e89b-42d3-a456-426614174000",
  receivedAt: "2026-07-11T04:05:06.789Z",
  privacyPolicyVersion: "1.0",
  privacyPolicyEffectiveDate: "2026-07-11",
  privacyPolicySnapshotId: "a".repeat(64)
} satisfies ContactEmailServerContext;

describe("contact form validation", () => {
  it("rejects invalid submissions with field-level errors", () => {
    const result = validateContactForm({
      name: "",
      phone: "123",
      organization: "",
      email: "bad-email",
      customerType: "",
      needType: "",
      assetType: "",
      platformUrl: "ftp://example.com/risk-video",
      message: "太短",
      consent: false
    });

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        phone: expect.any(String),
        email: expect.any(String),
        customerType: expect.any(String),
        needType: expect.any(String),
        assetType: expect.any(String),
        platformUrl: expect.any(String),
        message: expect.any(String),
        consent: expect.any(String)
      })
    );
    expect(result.errors).not.toHaveProperty("organization");
  });

  it("accepts a phone-only submission without an organization", () => {
    const result = validateContactForm({
      ...validValues,
      organization: "",
      email: ""
    });

    expect(result).toEqual({ success: true, errors: {} });
  });

  it("accepts an email-only submission without an organization", () => {
    const result = validateContactForm({
      ...validValues,
      phone: "",
      organization: ""
    });

    expect(result).toEqual({ success: true, errors: {} });
  });

  it("requires at least one contact method without assigning field errors", () => {
    const result = validateContactForm({
      ...validValues,
      phone: "",
      email: ""
    });

    expect(result).toEqual({
      success: false,
      errors: {
        contactMethod: "请至少填写手机号或邮箱中的一项"
      }
    });
    expect(result.errors).not.toHaveProperty("phone");
    expect(result.errors).not.toHaveProperty("email");
  });

  it("rejects an invalid supplied phone when the email is valid", () => {
    const result = validateContactForm({
      ...validValues,
      phone: "123"
    });

    expect(result.success).toBe(false);
    expect(result.errors).toEqual({
      phone: "请填写有效的中国大陆手机号"
    });
  });

  it("rejects an invalid supplied email when the phone is valid", () => {
    const result = validateContactForm({
      ...validValues,
      email: "bad-email"
    });

    expect(result.success).toBe(false);
    expect(result.errors).toEqual({
      email: "请填写有效邮箱"
    });
  });

  it("accepts an empty organization", () => {
    const result = validateContactForm({
      ...validValues,
      organization: ""
    });

    expect(result).toEqual({ success: true, errors: {} });
  });

  it("accepts a valid first-version certification submission", () => {
    const result = validateContactForm(validValues);

    expect(result).toEqual({ success: true, errors: {} });
  });

  const lengthCases = [
    ["name", "姓名"],
    ["phone", "手机号"],
    ["organization", "机构或工作室名称"],
    ["email", "邮箱"],
    ["customerType", "客户类型"],
    ["needType", "需求类型"],
    ["assetType", "资产类型"],
    ["platformUrl", "平台或链接"],
    ["message", "需求描述"]
  ] as const satisfies ReadonlyArray<readonly [Exclude<keyof ContactFormValues, "consent">, string]>;

  it.each(lengthCases)("rejects %s values beyond the configured maximum", (field, label) => {
    const limit = contactFieldLimits[field];
    const result = validateContactForm({
      ...validValues,
      [field]: "测".repeat(limit + 1)
    });

    expect(result.errors[field]).toBe(`${label}不能超过 ${limit} 个字符`);
  });

  it("counts surrounding whitespace toward the raw field maximum", () => {
    const result = validateContactForm({
      ...validValues,
      name: `${validValues.name}${" ".repeat(contactFieldLimits.name)}`
    });

    expect(result.errors.name).toBe(
      `姓名不能超过 ${contactFieldLimits.name} 个字符`
    );
  });
});

describe("contact policy submission metadata contract", () => {
  it("exports bounded client-safe policy metadata fields", () => {
    expect(contactPolicyMetadataLimits).toEqual({
      version: 32,
      effectiveDate: 10,
      snapshotId: 64
    });

    const errorKey: ContactFormErrorKey = "contactMethod";
    const metadata: ContactPolicySubmissionMetadata = {
      privacyPolicyVersion: "1.0",
      privacyPolicyEffectiveDate: "2026-07-11",
      privacyPolicySnapshotId: "a".repeat(64)
    };

    expect(errorKey).toBe("contactMethod");
    expect(metadata.privacyPolicySnapshotId).toHaveLength(64);
    expectTypeOf<ContactFormErrors>().toEqualTypeOf<
      Partial<Record<ContactFormErrorKey, string>>
    >();
  });
});

describe("contact email", () => {
  it("builds a plain-text first-version certification email with server evidence", () => {
    const email = buildContactEmail(validValues, emailServerContext);

    expect(Object.keys(email).sort()).toEqual(["subject", "text"]);
    expect(email.subject).toContain("首版认证官网需求");
    expect(email.subject).toContain(validValues.needType);
    expect(email.text).toContain(`请求 ID：${emailServerContext.requestId}`);
    expect(email.text).toContain(
      `服务端接收时间：${emailServerContext.receivedAt}`
    );
    expect(email.text).toContain(
      `隐私政策版本：${emailServerContext.privacyPolicyVersion}`
    );
    expect(email.text).toContain(
      `隐私政策生效日期：${emailServerContext.privacyPolicyEffectiveDate}`
    );
    expect(email.text).toContain(
      `隐私政策快照 ID：${emailServerContext.privacyPolicySnapshotId}`
    );
    expect(email.text).toContain(`姓名：${validValues.name}`);
    expect(email.text).toContain(`手机号：${validValues.phone}`);
    expect(email.text).toContain(`机构：${validValues.organization}`);
    expect(email.text).toContain(`邮箱：${validValues.email}`);
    expect(email.text).toContain(`客户类型：${validValues.customerType}`);
    expect(email.text).toContain(`需求类型：${validValues.needType}`);
    expect(email.text).toContain(`资产类型：${validValues.assetType}`);
    expect(email.text).toContain(`平台或链接：${validValues.platformUrl}`);
    expect(email.text).toContain(`需求描述：${validValues.message}`);
    expect(email.text).toContain(
      "用户确认：已阅读隐私政策并同意为回复本次询问处理本次提交信息"
    );
    expectTypeOf(buildContactEmail).parameters.toEqualTypeOf<
      [ContactFormValues, ContactEmailServerContext]
    >();
  });

  it("normalizes an allowlisted need type before using it in the subject", () => {
    const allowedNeedType = contactNeedTypes[0];
    const email = buildContactEmail(
      {
        ...validValues,
        needType: ` \r\n${allowedNeedType}\r\n `
      },
      emailServerContext
    );

    expect(email.subject).toBe(`首版认证官网需求：${allowedNeedType}`);
    expect(email.subject).not.toMatch(/[\r\n]/);
  });

  it("renders empty optional contact fields as not provided", () => {
    const email = buildContactEmail(
      {
        ...validValues,
        phone: "",
        organization: "   ",
        email: "",
        platformUrl: ""
      },
      emailServerContext
    );

    expect(email.text).toContain("手机号：未填写");
    expect(email.text).toContain("机构：未填写");
    expect(email.text).toContain("邮箱：未填写");
    expect(email.text).toContain("平台或链接：未填写");
  });
});

describe("contact options", () => {
  it("contains the first-version certification options", () => {
    expect(customerTypes).toContain(validValues.customerType);
    expect(contactNeedTypes).toContain(validValues.needType);
    expect(assetTypes).toContain(validValues.assetType);
  });
});
