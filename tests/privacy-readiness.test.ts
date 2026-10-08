import { describe, expect, it, vi } from "vitest";
import {
  CHILD_CONTACT_NOTICE,
  PRIVACY_COLLECTION_FIELDS,
  PUBLIC_PRIVACY_POLICY,
  SENSITIVE_MATERIAL_WARNING
} from "../lib/privacy-policy.mjs";
import * as privacyPolicyModule from "../lib/privacy-policy.mjs";
import {
  canonicalJson,
  createEvaluationTime,
  createPrivacyPolicySnapshotId,
  evaluateContactCollectionReadiness,
  evaluatePrivacyPublicConfig,
  type CanonicalJsonValue,
  type ContactCollectionReadiness,
  type EffectivePrivacyConfig,
  type EvaluationTime,
  type PrivacyPublicConfigResult,
  type PrivacyReadinessIssue,
  type PrivacyReadinessIssueCode
} from "../lib/privacy-readiness.mjs";
import { getContactCollectionReadiness } from "../lib/privacy-readiness.server";
import {
  createPrivacyTestEnv,
  createReadyPrivacyEnv,
  getReadyPrivacyResult,
  privacyEvaluationTime
} from "./privacy-fixtures";

type PublicEnvironment = Record<string, string | undefined>;
type TestConsentContract = Readonly<Record<string, CanonicalJsonValue>>;

const evaluationTime = privacyEvaluationTime;

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
] as const;

const publicEnv = createPrivacyTestEnv();

function getConsentContract(): TestConsentContract {
  const contract = Reflect.get(
    privacyPolicyModule,
    "PRIVACY_POLICY_CONSENT_CONTRACT"
  ) as TestConsentContract | undefined;

  expect(contract).toBeDefined();
  if (contract === undefined) {
    throw new Error("Expected a client-safe privacy consent contract");
  }

  return contract;
}

function expectDeepFrozen(value: unknown): void {
  if (value === null || typeof value !== "object") {
    return;
  }

  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value as Readonly<Record<string, unknown>>)) {
    expectDeepFrozen(nested);
  }
}

const requiredPublicKeys = Object.keys(publicEnv);

const validEdgeOneEnv = {
  EDGEONE_VERIFIED_AT: "2026-07-11T03:30:00.000Z",
  EDGEONE_VERIFICATION_ID: "edge-verification-001",
  EDGEONE_SITE_ID: "edge-site-001",
  EDGEONE_RATE_LIMIT_RULE_ID: "edge-rule-001",
  EDGEONE_VERIFIED_SITE_ID: "edge-site-001",
  EDGEONE_VERIFIED_RATE_LIMIT_RULE_ID: "edge-rule-001",
  EDGEONE_VERIFIED_ORIGIN: "https://www.shouban.test",
  EDGEONE_LOG_RETENTION_DAYS: "30",
  EDGEONE_LOG_STORAGE_LOCATION: "中国大陆（北京）"
} as const satisfies PublicEnvironment;

function expectReady(
  env: PublicEnvironment = publicEnv,
  time: EvaluationTime = evaluationTime
): EffectivePrivacyConfig {
  const result: PrivacyPublicConfigResult = evaluatePrivacyPublicConfig(env, time);

  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("Expected the public privacy configuration to be valid");
  }

  return result.publicConfig;
}

function expectInvalid(
  env: PublicEnvironment,
  expectedKey: string,
  expectedCode: PrivacyReadinessIssueCode,
  time: EvaluationTime = evaluationTime
): readonly PrivacyReadinessIssue[] {
  const result: PrivacyPublicConfigResult = evaluatePrivacyPublicConfig(env, time);

  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error("Expected the public privacy configuration to be invalid");
  }

  expect(result.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: expectedCode,
        key: expectedKey
      })
    ])
  );
  for (const issue of result.issues) {
    expect(Object.keys(issue).sort()).toEqual(["code", "key"]);
  }

  return result.issues;
}

describe("public privacy policy facts", () => {
  it("publishes the exact immutable policy constants", () => {
    expect(PUBLIC_PRIVACY_POLICY).toEqual({
      version: "1.0",
      processorName: "北京首版认证有限公司",
      unconvertedInquiryRetentionDays: 180,
      applicationLogRetentionDays: 30,
      rightsRecordRetentionDays: 180,
      rightsResponseWorkingDays: 15,
      childAgeThreshold: 14,
      rightsCommitments
    });
    expect(PRIVACY_COLLECTION_FIELDS).toEqual([
      {
        key: "name",
        label: "姓名",
        requiredness: "必填",
        purpose: "识别询问人并进行业务沟通",
        processingMethod: "用户主动填写，经同源 API 校验后通过纯文本企业邮件处理",
        retentionKind: "inquiry"
      },
      {
        key: "contactMethod",
        label: "手机号或邮箱",
        requiredness: "至少填写一项",
        purpose: "回复本次询问",
        processingMethod: "用户主动填写，经同源 API 校验后通过纯文本企业邮件处理",
        retentionKind: "inquiry"
      },
      {
        key: "organization",
        label: "机构或工作室",
        requiredness: "选填",
        purpose: "了解机构背景",
        processingMethod: "用户主动填写，经同源 API 校验后通过纯文本企业邮件处理",
        retentionKind: "inquiry"
      },
      {
        key: "customerType",
        label: "客户类型",
        requiredness: "必填",
        purpose: "选择沟通背景",
        processingMethod: "用户主动填写，经同源 API 校验后通过纯文本企业邮件处理",
        retentionKind: "inquiry"
      },
      {
        key: "needType",
        label: "需求类型",
        requiredness: "必填",
        purpose: "分派服务流程",
        processingMethod: "用户主动填写，经同源 API 校验后通过纯文本企业邮件处理",
        retentionKind: "inquiry"
      },
      {
        key: "assetType",
        label: "资产类型",
        requiredness: "必填",
        purpose: "分派专业方向",
        processingMethod: "用户主动填写，经同源 API 校验后通过纯文本企业邮件处理",
        retentionKind: "inquiry"
      },
      {
        key: "platformUrl",
        label: "平台或链接",
        requiredness: "选填",
        purpose: "定位公开线索",
        processingMethod: "用户主动填写，经同源 API 校验后通过纯文本企业邮件处理",
        retentionKind: "inquiry"
      },
      {
        key: "message",
        label: "需求描述",
        requiredness: "必填",
        purpose: "理解并回复需求",
        processingMethod: "用户主动填写，经同源 API 校验后通过纯文本企业邮件处理",
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
    ]);
    expect(SENSITIVE_MATERIAL_WARNING).toBe(
      "请勿提交身份证件号码、财务或健康信息、原始声纹或肖像素材、案件秘密，以及未经授权的第三方个人信息。"
    );
    expect(CHILD_CONTACT_NOTICE).toBe(
      "本表单不面向14周岁以下未成年人；请勿通过本表单提交未成年人个人信息。"
    );
    expect(Object.isFrozen(PUBLIC_PRIVACY_POLICY)).toBe(true);
    expect(Object.isFrozen(PUBLIC_PRIVACY_POLICY.rightsCommitments)).toBe(true);
    expect(Object.isFrozen(PRIVACY_COLLECTION_FIELDS)).toBe(true);
    expect(PRIVACY_COLLECTION_FIELDS.every((field) => Object.isFrozen(field))).toBe(true);
  });

  it("publishes one deeply frozen client-safe consent contract", () => {
    const contract = getConsentContract();

    expect(Object.keys(contract).sort()).toEqual([
      "children",
      "collectionFields",
      "processing",
      "retention",
      "rights",
      "sections",
      "security",
      "sensitiveMaterialWarning",
      "technicalData",
      "updates"
    ]);
    expect(contract.sections).toHaveLength(10);
    expect(contract.collectionFields).toHaveLength(9);
    expect(JSON.stringify(contract)).toContain("同源 API 校验");
    expect(JSON.stringify(contract)).toContain("IP 地址");
    expect(JSON.stringify(contract)).toContain("User-Agent");
    expect(JSON.stringify(contract)).toContain("多因素认证（MFA）");
    expect(JSON.stringify(contract)).toContain("实质变化前");
    expect(JSON.stringify(contract)).not.toMatch(/SMTP_PASS|CONTACT_TO_EMAIL|PRIVACY_OPERATIONS/);
    expectDeepFrozen(contract);
  });
});

describe("canonical privacy-policy snapshots", () => {
  it("sorts object keys recursively while preserving array order", () => {
    const value = {
      z: [{ second: 2, first: 1 }, "tail"],
      a: { beta: false, alpha: null }
    };

    expect(canonicalJson(value)).toBe(
      '{"a":{"alpha":null,"beta":false},"z":[{"first":1,"second":2},"tail"]}'
    );
    expect(canonicalJson(["first", "second"])).not.toBe(
      canonicalJson(["second", "first"])
    );
  });

  it("serializes null but rejects every non-finite number", () => {
    expect(canonicalJson(null)).toBe("null");

    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => canonicalJson(value)).toThrow(TypeError);
    }
  });

  it("rejects unsupported runtime primitives instead of returning undefined", () => {
    const canonicalJsonAtRuntime = canonicalJson as (value: unknown) => string;

    for (const value of [undefined, () => null, Symbol("unsupported"), 1n]) {
      expect(() => canonicalJsonAtRuntime(value)).toThrow(TypeError);
    }
    expect(() => canonicalJsonAtRuntime({ nested: undefined })).toThrow(TypeError);
  });

  it("rejects cyclic objects with a TypeError", () => {
    const canonicalJsonAtRuntime = canonicalJson as (value: unknown) => string;
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    expect(() => canonicalJsonAtRuntime(cyclic)).toThrow(TypeError);
  });

  it("creates the same lowercase SHA-256 for equivalent insertion orders", () => {
    const first = {
      version: "1.0",
      nested: { effectiveDate: "2026-07-11", purpose: "回复询问" },
      fields: ["name", "contactMethod"]
    };
    const second = {
      fields: ["name", "contactMethod"],
      nested: { purpose: "回复询问", effectiveDate: "2026-07-11" },
      version: "1.0"
    };

    expect(createPrivacyPolicySnapshotId(first)).toBe(
      createPrivacyPolicySnapshotId(second)
    );
    expect(createPrivacyPolicySnapshotId(first)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("derives the injected instant and Beijing calendar date deterministically", () => {
    expect(createEvaluationTime(new Date("2026-07-10T16:00:00.000Z"))).toEqual({
      nowIso: "2026-07-10T16:00:00.000Z",
      beijingDate: "2026-07-11"
    });
  });
});

describe("public privacy configuration", () => {
  it("returns the exact effective public contract and a deterministic snapshot", () => {
    const first = expectReady(publicEnv);
    const second = expectReady({ ...publicEnv });

    expect(second).toEqual(first);
    expect(first).toEqual({
      policyVersion: "1.0",
      effectiveDate: "2026-07-11",
      siteOrigin: "https://www.shouban.test",
      processorName: "北京首版认证有限公司",
      privacyContactEmail: "privacy@shouban.test",
      hosting: {
        providerName: "腾讯云",
        productName: "轻量应用服务器 Lighthouse",
        location: "中国大陆（北京）"
      },
      mail: {
        smtpRelay: {
          providerName: "测试企业邮件服务",
          location: "中国大陆（北京）"
        },
        contactMailbox: {
          providerName: "测试企业邮件服务",
          location: "中国大陆（北京）"
        },
        rightsMailbox: {
          providerName: "测试企业邮件服务",
          location: "中国大陆（北京）"
        },
        deletionMethod:
          "删除收件箱、已发送、回收站及受控副本，并按服务商备份到期机制清除"
      },
      retention: {
        unconvertedInquiryDays: 180,
        applicationLogDays: 30,
        rightsRecordDays: 180
      },
      rightsResponseWorkingDays: 15,
      childAgeThreshold: 14,
      edgeOne: { enabled: false },
      privacyPolicySnapshotId: expect.stringMatching(/^[a-f0-9]{64}$/)
    });
  });

  it("includes the entire immutable consent contract in the evaluator snapshot", () => {
    const config = expectReady(publicEnv);
    const consentContract = getConsentContract();
    const expectedSnapshotFacts = {
      policyVersion: config.policyVersion,
      effectiveDate: config.effectiveDate,
      siteOrigin: config.siteOrigin,
      processorName: config.processorName,
      privacyContactEmail: config.privacyContactEmail,
      consentContract,
      hosting: config.hosting,
      mail: config.mail,
      retention: config.retention,
      rights: {
        responseWorkingDays: config.rightsResponseWorkingDays,
        recordRetentionDays: config.retention.rightsRecordDays
      },
      childAgeThreshold: config.childAgeThreshold,
      edgeOne: config.edgeOne
    };

    expect(config.privacyPolicySnapshotId).toBe(
      createPrivacyPolicySnapshotId(expectedSnapshotFacts)
    );
    expect(
      createPrivacyPolicySnapshotId({
        ...expectedSnapshotFacts,
        consentContract: {
          ...consentContract,
          rights: { commitments: rightsCommitments.slice(0, -1) }
        }
      })
    ).not.toBe(config.privacyPolicySnapshotId);
  });

  it.each([
    "processing",
    "technicalData",
    "retention",
    "security",
    "children",
    "updates",
    "sections",
    "collectionFields"
  ] as const)(
    "changes the snapshot when consent-contract group %s changes",
    (group) => {
      const config = expectReady(publicEnv);
      const consentContract = getConsentContract();
      const baselineFacts = {
        policyVersion: config.policyVersion,
        effectiveDate: config.effectiveDate,
        siteOrigin: config.siteOrigin,
        processorName: config.processorName,
        privacyContactEmail: config.privacyContactEmail,
        consentContract,
        hosting: config.hosting,
        mail: config.mail,
        retention: config.retention,
        rights: {
          responseWorkingDays: config.rightsResponseWorkingDays,
          recordRetentionDays: config.retention.rightsRecordDays
        },
        childAgeThreshold: config.childAgeThreshold,
        edgeOne: config.edgeOne
      };
      const mutatedContract = {
        ...consentContract,
        [group]: { changedConsentFact: group }
      };

      expect(
        createPrivacyPolicySnapshotId({
          ...baselineFacts,
          consentContract: mutatedContract
        })
      ).not.toBe(config.privacyPolicySnapshotId);
    }
  );

  const publicFactMutations = [
    ["NEXT_PUBLIC_SITE_URL", "https://privacy.shouban.test"],
    ["PRIVACY_CONTACT_EMAIL", "rights@shouban.test"],
    ["PRIVACY_POLICY_EFFECTIVE_DATE", "2026-07-10"],
    ["PRIVACY_HOSTING_PROVIDER_NAME", "腾讯云测试实例"],
    ["PRIVACY_HOSTING_PRODUCT_NAME", "云服务器 CVM"],
    ["PRIVACY_HOSTING_LOCATION", "中国大陆（上海）"],
    ["PRIVACY_SMTP_RELAY_PROVIDER_NAME", "测试中继邮件服务"],
    ["PRIVACY_SMTP_RELAY_LOCATION", "中国大陆（上海）"],
    ["PRIVACY_CONTACT_MAILBOX_PROVIDER_NAME", "测试收件邮件服务"],
    ["PRIVACY_CONTACT_MAILBOX_LOCATION", "中国大陆（深圳）"],
    ["PRIVACY_RIGHTS_MAILBOX_PROVIDER_NAME", "测试权利邮件服务"],
    ["PRIVACY_RIGHTS_MAILBOX_LOCATION", "中国大陆（广州）"],
    ["PRIVACY_MAIL_DELETION_METHOD", "立即删除全部邮件及受控副本"]
  ] as const;

  it.each(publicFactMutations)(
    "changes the snapshot when public fact %s changes",
    (key, value) => {
      const baseline = expectReady(publicEnv).privacyPolicySnapshotId;
      const changed = expectReady({ ...publicEnv, [key]: value });

      expect(changed.privacyPolicySnapshotId).not.toBe(baseline);
    }
  );

  it("changes the snapshot for each effective EdgeOne disclosure fact", () => {
    const disabled = expectReady(publicEnv).privacyPolicySnapshotId;
    const enabled = expectReady({
      ...publicEnv,
      ...validEdgeOneEnv
    }).privacyPolicySnapshotId;
    const changedRetention = expectReady({
      ...publicEnv,
      ...validEdgeOneEnv,
      EDGEONE_LOG_RETENTION_DAYS: "60"
    }).privacyPolicySnapshotId;
    const changedLocation = expectReady({
      ...publicEnv,
      ...validEdgeOneEnv,
      EDGEONE_LOG_STORAGE_LOCATION: "中国大陆（上海）"
    }).privacyPolicySnapshotId;

    expect(enabled).not.toBe(disabled);
    expect(changedRetention).not.toBe(enabled);
    expect(changedLocation).not.toBe(enabled);
  });

  it("does not hash SMTP secrets, operational attestation, or EdgeOne evidence IDs", () => {
    const baseline = expectReady({
      ...publicEnv,
      ...validEdgeOneEnv,
      SMTP_PASS: "first-secret",
      SERVICE_VERSION_ID: "service-version-one",
      PRIVACY_OPERATIONS_ATTESTATION_ID: "attestation-one"
    });
    const changedEvidence = expectReady({
      ...publicEnv,
      ...validEdgeOneEnv,
      SMTP_PASS: "second-secret",
      SERVICE_VERSION_ID: "service-version-two",
      PRIVACY_OPERATIONS_ATTESTATION_ID: "attestation-two",
      EDGEONE_VERIFIED_AT: "2026-07-11T02:30:00.000Z",
      EDGEONE_VERIFICATION_ID: "edge-verification-999",
      EDGEONE_SITE_ID: "edge-site-999",
      EDGEONE_VERIFIED_SITE_ID: "edge-site-999",
      EDGEONE_RATE_LIMIT_RULE_ID: "edge-rule-999",
      EDGEONE_VERIFIED_RATE_LIMIT_RULE_ID: "edge-rule-999"
    });

    expect(changedEvidence.privacyPolicySnapshotId).toBe(
      baseline.privacyPolicySnapshotId
    );
  });

  it("never serializes an unrelated secret sentinel", () => {
    const sentinel = "SENTINEL_SMTP_SECRET_DO_NOT_SERIALIZE";
    const result = evaluatePrivacyPublicConfig(
      {
        ...publicEnv,
        SMTP_HOST: sentinel,
        SMTP_USER: sentinel,
        SMTP_PASS: sentinel,
        PRIVACY_OPERATIONS_ATTESTATION_ID: sentinel
      },
      evaluationTime
    );

    expect(result).toMatchObject({ ok: true });
    expect(JSON.stringify(result)).not.toContain(sentinel);
  });
});

describe("public privacy validation", () => {
  it.each(requiredPublicKeys)("rejects missing public fact %s", (key) => {
    const env: PublicEnvironment = { ...publicEnv };
    delete env[key];

    expectInvalid(env, key, "PRIVACY_CONFIG_MISSING");
  });

  it.each(["", "   "])("rejects the empty public fact form %j", (emptyValue) => {
    expectInvalid(
      { ...publicEnv, PRIVACY_HOSTING_PROVIDER_NAME: emptyValue },
      "PRIVACY_HOSTING_PROVIDER_NAME",
      "PRIVACY_CONFIG_MISSING"
    );
  });

  it.each([
    "待公司确认",
    "  待开通  ",
    "EXAMPLE.COM",
    "示例值 service.ExAmPlE.CoM/path",
    "change-me",
    "  CHANGE-ME  "
  ])("rejects the placeholder form %j after trimming and case-folding", (placeholder) => {
    expectInvalid(
      { ...publicEnv, PRIVACY_HOSTING_PROVIDER_NAME: placeholder },
      "PRIVACY_HOSTING_PROVIDER_NAME",
      "PRIVACY_CONFIG_PLACEHOLDER"
    );
  });

  it.each([
    "privacy",
    "privacy@invalid",
    "@shouban.test",
    "privacy @shouban.test",
    "privacy@shouban..test",
    ".privacy@shouban.test",
    "privacy.@shouban.test",
    "privacy@-shouban.test",
    "privacy@shouban-.test",
    "privacy@shouban_test.test"
  ])(
    "rejects invalid privacy email %j",
    (email) => {
      expectInvalid(
        { ...publicEnv, PRIVACY_CONTACT_EMAIL: email },
        "PRIVACY_CONTACT_EMAIL",
        "PRIVACY_CONFIG_INVALID_EMAIL"
      );
    }
  );

  it.each(["privacy@example.com", "privacy@sub.EXAMPLE.com"])(
    "rejects example-domain privacy email %j",
    (email) => {
      expectInvalid(
        { ...publicEnv, PRIVACY_CONTACT_EMAIL: email },
        "PRIVACY_CONTACT_EMAIL",
        "PRIVACY_CONFIG_PLACEHOLDER"
      );
    }
  );

  it("accepts the Beijing same-day effective-date boundary", () => {
    expectReady(
      { ...publicEnv, PRIVACY_POLICY_EFFECTIVE_DATE: evaluationTime.beijingDate },
      evaluationTime
    );
  });

  it("rejects an effective date after the Beijing calendar date", () => {
    expectInvalid(
      { ...publicEnv, PRIVACY_POLICY_EFFECTIVE_DATE: "2026-07-12" },
      "PRIVACY_POLICY_EFFECTIVE_DATE",
      "PRIVACY_CONFIG_FUTURE_EFFECTIVE_DATE"
    );
  });

  it.each(["2026/07/11", "2026-7-11", "2026-02-30", "not-a-date"])(
    "rejects invalid effective date %j",
    (effectiveDate) => {
      expectInvalid(
        { ...publicEnv, PRIVACY_POLICY_EFFECTIVE_DATE: effectiveDate },
        "PRIVACY_POLICY_EFFECTIVE_DATE",
        "PRIVACY_CONFIG_INVALID_EFFECTIVE_DATE"
      );
    }
  );

  it.each([
    "http://www.shouban.test",
    "https://user:password@www.shouban.test",
    "https://www.shouban.test/contact",
    "https://www.shouban.test?preview=1",
    "https://www.shouban.test#privacy",
    "https://www.shouban.test/",
    "https://www.shouban.test:443",
    "not-a-url"
  ])("rejects a non-HTTPS-exact-origin site URL %j", (siteUrl) => {
    expectInvalid(
      { ...publicEnv, NEXT_PUBLIC_SITE_URL: siteUrl },
      "NEXT_PUBLIC_SITE_URL",
      "PRIVACY_CONFIG_INVALID_SITE_ORIGIN"
    );
  });

  it.each([
    "PRIVACY_SMTP_RELAY_LOCATION",
    "PRIVACY_CONTACT_MAILBOX_LOCATION",
    "PRIVACY_RIGHTS_MAILBOX_LOCATION"
  ])("rejects non-mainland mail location %s", (key) => {
    expectInvalid(
      { ...publicEnv, [key]: "中国香港" },
      key,
      "PRIVACY_CONFIG_MAIL_LOCATION_NOT_MAINLAND"
    );
  });
});

describe("optional EdgeOne evidence", () => {
  it("treats all nine absent values as disabled", () => {
    expect(expectReady(publicEnv).edgeOne).toEqual({ enabled: false });
  });

  it("enables the public disclosure when all nine values are valid", () => {
    expect(expectReady({ ...publicEnv, ...validEdgeOneEnv }).edgeOne).toEqual({
      enabled: true,
      logRetentionDays: 30,
      logStorageLocation: "中国大陆（北京）"
    });
  });

  it("rejects a partial evidence set", () => {
    expectInvalid(
      { ...publicEnv, EDGEONE_SITE_ID: validEdgeOneEnv.EDGEONE_SITE_ID },
      "EDGEONE_VERIFIED_AT",
      "PRIVACY_EDGEONE_INCOMPLETE"
    );
  });

  it("rejects a future verification instant", () => {
    expectInvalid(
      {
        ...publicEnv,
        ...validEdgeOneEnv,
        EDGEONE_VERIFIED_AT: "2026-07-11T04:00:00.001Z"
      },
      "EDGEONE_VERIFIED_AT",
      "PRIVACY_EDGEONE_FUTURE_VERIFIED_AT"
    );
  });

  it.each(["not-a-time", "2026-02-30T00:00:00.000Z"])(
    "rejects invalid verification instant %j",
    (verifiedAt) => {
      expectInvalid(
        { ...publicEnv, ...validEdgeOneEnv, EDGEONE_VERIFIED_AT: verifiedAt },
        "EDGEONE_VERIFIED_AT",
        "PRIVACY_EDGEONE_INVALID_VERIFIED_AT"
      );
    }
  );

  it("rejects a verified origin that differs from the site origin", () => {
    expectInvalid(
      {
        ...publicEnv,
        ...validEdgeOneEnv,
        EDGEONE_VERIFIED_ORIGIN: "https://other.shouban.test"
      },
      "EDGEONE_VERIFIED_ORIGIN",
      "PRIVACY_EDGEONE_ORIGIN_MISMATCH"
    );
  });

  it("rejects a current-versus-verified site mismatch", () => {
    expectInvalid(
      {
        ...publicEnv,
        ...validEdgeOneEnv,
        EDGEONE_VERIFIED_SITE_ID: "edge-site-stale"
      },
      "EDGEONE_VERIFIED_SITE_ID",
      "PRIVACY_EDGEONE_SITE_ID_MISMATCH"
    );
  });

  it("rejects a current-versus-verified rule mismatch", () => {
    expectInvalid(
      {
        ...publicEnv,
        ...validEdgeOneEnv,
        EDGEONE_VERIFIED_RATE_LIMIT_RULE_ID: "edge-rule-stale"
      },
      "EDGEONE_VERIFIED_RATE_LIMIT_RULE_ID",
      "PRIVACY_EDGEONE_RATE_LIMIT_RULE_ID_MISMATCH"
    );
  });

  it.each(["0", "-1", "1.5", "days"])(
    "rejects non-positive-integer log retention %j",
    (retentionDays) => {
      expectInvalid(
        {
          ...publicEnv,
          ...validEdgeOneEnv,
          EDGEONE_LOG_RETENTION_DAYS: retentionDays
        },
        "EDGEONE_LOG_RETENTION_DAYS",
        "PRIVACY_EDGEONE_INVALID_LOG_RETENTION"
      );
    }
  );

  it("treats empty EdgeOne log retention as a partial evidence set", () => {
    expectInvalid(
      {
        ...publicEnv,
        ...validEdgeOneEnv,
        EDGEONE_LOG_RETENTION_DAYS: ""
      },
      "EDGEONE_LOG_RETENTION_DAYS",
      "PRIVACY_EDGEONE_INCOMPLETE"
    );
  });
});

const runtimeDeliveryKeys = [
  "CONTACT_TO_EMAIL",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "NEXT_PUBLIC_SITE_URL"
] as const;

const attestationKeys = [
  "SERVICE_VERSION_ID",
  "PRIVACY_OPERATIONS_ATTESTATION_ID",
  "PRIVACY_OPERATIONS_APPROVED_AT",
  "PRIVACY_OPERATIONS_OWNER",
  "PRIVACY_ATTESTED_SERVICE_VERSION_ID",
  "PRIVACY_ATTESTED_SITE_ORIGIN",
  "PRIVACY_ATTESTED_PUBLIC_SNAPSHOT_ID"
] as const;

function expectContactNotReady(
  env: PublicEnvironment,
  expectedKey?: string
): readonly PrivacyReadinessIssue[] {
  const result: ContactCollectionReadiness = evaluateContactCollectionReadiness(
    env,
    evaluationTime
  );

  expect(result.ready).toBe(false);
  if (result.ready) {
    throw new Error("Expected contact collection to be unavailable");
  }

  if (expectedKey !== undefined) {
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: expectedKey })])
    );
  }
  for (const issue of result.issues) {
    expect(Object.keys(issue).sort()).toEqual(["code", "key"]);
  }

  return result.issues;
}

function expectContactIssue(
  env: PublicEnvironment,
  expectedIssue: PrivacyReadinessIssue
): void {
  const issues = expectContactNotReady(env, expectedIssue.key);
  expect(issues).toContainEqual(expectedIssue);
}

describe("contact collection runtime readiness", () => {
  it("returns only the effective public configuration when every binding is valid", () => {
    const publicResult = evaluatePrivacyPublicConfig(publicEnv, evaluationTime);
    if (!publicResult.ok) {
      throw new Error("Expected the public fixture to be valid");
    }

    const result = getReadyPrivacyResult();

    expect(result).toEqual({
      ready: true,
      publicConfig: publicResult.publicConfig
    });
    expect(Object.keys(result).sort()).toEqual(["publicConfig", "ready"]);

    const serialized = JSON.stringify(result);
    for (const sensitiveValue of [
      "SENTINEL_SMTP_PASSWORD",
      "smtp.shouban.test",
      "smtp-user",
      "contact@shouban.test",
      "首版认证 <contact@shouban.test>",
      "release-2026-07-11-001",
      "ops-attestation-001",
      "privacy-operations-owner",
      "2026-07-11T03:00:00.000Z"
    ]) {
      expect(serialized).not.toContain(sensitiveValue);
    }
  });

  it.each(runtimeDeliveryKeys)("fails closed when runtime key %s is missing", (key) => {
    const env = createReadyPrivacyEnv();
    delete env[key];

    expectContactNotReady(env, key);
  });

  it.each(["25", "2525", "587.0", "4650"])(
    "rejects unsupported SMTP port %j",
    (port) => {
      expectContactNotReady(createReadyPrivacyEnv({ SMTP_PORT: port }), "SMTP_PORT");
    }
  );

  it.each([
    "contact",
    "contact@invalid",
    "contact @shouban.test",
    "contact@shouban..test",
    ".contact@shouban.test",
    "contact@-shouban.test"
  ])("rejects invalid delivery mailbox %j", (mailbox) => {
    expectContactNotReady(
      createReadyPrivacyEnv({ CONTACT_TO_EMAIL: mailbox }),
      "CONTACT_TO_EMAIL"
    );
  });

  it.each([" contact@shouban.test", "contact@shouban.test "])(
    "rejects delivery mailbox with surrounding whitespace %j",
    (mailbox) => {
      expectContactIssue(createReadyPrivacyEnv({ CONTACT_TO_EMAIL: mailbox }), {
        code: "PRIVACY_CONFIG_INVALID_EMAIL",
        key: "CONTACT_TO_EMAIL"
      });
    }
  );

  it("accepts a strict bare mailbox as SMTP_FROM", () => {
    expect(getReadyPrivacyResult({ SMTP_FROM: "sender@shouban.test" })).toMatchObject({
      ready: true
    });
  });

  it("accepts ordinary spaces inside the SMTP_FROM display name", () => {
    expect(
      getReadyPrivacyResult({
        SMTP_FROM: "Beijing First Edition <sender@shouban.test>"
      })
    ).toMatchObject({ ready: true });
  });

  it.each([
    "首版认证 <sender>",
    "首版认证 sender@shouban.test",
    "<sender@shouban.test>",
    "首版认证 <sender@shouban.test> trailing",
    "首版<认证 <sender@shouban.test>"
  ])("rejects invalid SMTP_FROM %j", (from) => {
    expectContactNotReady(createReadyPrivacyEnv({ SMTP_FROM: from }), "SMTP_FROM");
  });

  it.each([
    "extra@shouban.test, Sender <sender@shouban.test>",
    "Group: sender@shouban.test;",
    "Bad\r\nBcc: victim@x.test <sender@shouban.test>",
    "Sender <sender@shouban.test>, Other <other@shouban.test>"
  ])("rejects non-single SMTP_FROM address syntax %j", (from) => {
    expectContactIssue(createReadyPrivacyEnv({ SMTP_FROM: from }), {
      code: "PRIVACY_CONFIG_INVALID_SMTP_FROM",
      key: "SMTP_FROM"
    });
  });

  it.each([
    " 首版认证 <sender@shouban.test>",
    "首版认证 <sender@shouban.test> "
  ])("rejects SMTP_FROM with surrounding whitespace %j", (from) => {
    expectContactIssue(createReadyPrivacyEnv({ SMTP_FROM: from }), {
      code: "PRIVACY_CONFIG_INVALID_SMTP_FROM",
      key: "SMTP_FROM"
    });
  });

  it.each([
    "smtp://smtp.shouban.test",
    "smtp.shouban.test/path",
    "smtp host.shouban.test",
    "-smtp.shouban.test",
    "smtp-.shouban.test",
    "smtp_shouban.test",
    "localhost",
    "smtp.shouban.test:587"
  ])("rejects invalid SMTP host %j", (host) => {
    expectContactNotReady(createReadyPrivacyEnv({ SMTP_HOST: host }), "SMTP_HOST");
  });

  it.each([
    " smtp.shouban.test",
    "smtp.shouban.test ",
    "smtp. shouban.test"
  ])("rejects SMTP host containing whitespace %j", (host) => {
    expectContactIssue(createReadyPrivacyEnv({ SMTP_HOST: host }), {
      code: "PRIVACY_CONFIG_INVALID_SMTP_HOST",
      key: "SMTP_HOST"
    });
  });

  it.each([
    ["SMTP_HOST", "smtp.example.com"],
    ["SMTP_USER", "change-me"],
    ["SMTP_PASS", "待开通"]
  ] as const)("rejects placeholder runtime field %s", (key, value) => {
    expectContactNotReady(createReadyPrivacyEnv({ [key]: value }), key);
  });

  it.each(attestationKeys)("fails closed when attestation key %s is missing", (key) => {
    const env = createReadyPrivacyEnv();
    delete env[key];

    expectContactNotReady(env, key);
  });

  it.each([
    ["PRIVACY_ATTESTED_SERVICE_VERSION_ID", "release-stale"],
    ["PRIVACY_ATTESTED_SITE_ORIGIN", "https://stale.shouban.test"],
    ["PRIVACY_ATTESTED_PUBLIC_SNAPSHOT_ID", "a".repeat(64)]
  ] as const)("rejects stale attestation binding %s", (key, value) => {
    expectContactNotReady(createReadyPrivacyEnv({ [key]: value }), key);
  });

  it.each(["A".repeat(64), "a".repeat(63), "not-a-sha256"])(
    "rejects malformed attested snapshot %j",
    (snapshot) => {
      expectContactNotReady(
        createReadyPrivacyEnv({ PRIVACY_ATTESTED_PUBLIC_SNAPSHOT_ID: snapshot }),
        "PRIVACY_ATTESTED_PUBLIC_SNAPSHOT_ID"
      );
    }
  );

  it("invalidates approval when a public fact changes afterwards", () => {
    const env = createReadyPrivacyEnv();
    env.PRIVACY_HOSTING_PROVIDER_NAME = "腾讯云变更后实例";

    expectContactNotReady(env, "PRIVACY_ATTESTED_PUBLIC_SNAPSHOT_ID");
  });

  it("deduplicates code and key pairs shared by public and runtime validation", () => {
    const env = createReadyPrivacyEnv();
    env.NEXT_PUBLIC_SITE_URL = "https://www.shouban.test/contact";
    const issues = expectContactNotReady(env, "NEXT_PUBLIC_SITE_URL");
    const identities = issues.map((issue) => `${issue.code}:${issue.key}`);

    expect(identities).toContain(
      "PRIVACY_CONFIG_INVALID_SITE_ORIGIN:NEXT_PUBLIC_SITE_URL"
    );
    expect(new Set(identities).size).toBe(identities.length);
  });

  it.each([
    "2026-07-11T04:00:00.001Z",
    "not-an-instant",
    "2026-02-30T00:00:00.000Z"
  ])("rejects future or invalid approval timestamp %j", (approvedAt) => {
    expectContactNotReady(
      createReadyPrivacyEnv({ PRIVACY_OPERATIONS_APPROVED_AT: approvedAt }),
      "PRIVACY_OPERATIONS_APPROVED_AT"
    );
  });

  it.each(attestationKeys)("rejects placeholder attestation field %s", (key) => {
    expectContactNotReady(createReadyPrivacyEnv({ [key]: "change-me" }), key);
  });

  it("returns redacted issues containing no runtime or attestation values", () => {
    const env = createReadyPrivacyEnv({
      CONTACT_TO_EMAIL: "delivery-secret@shouban.test",
      SMTP_HOST: "mail.internal.shouban.test",
      SMTP_PORT: "465",
      SMTP_USER: "SENTINEL_SMTP_USER",
      SMTP_PASS: "SENTINEL_SMTP_PASSWORD",
      SMTP_FROM: "Private Sender <sender-secret@shouban.test>",
      SERVICE_VERSION_ID: "release-secret-001",
      PRIVACY_OPERATIONS_ATTESTATION_ID: "attestation-secret-001",
      PRIVACY_OPERATIONS_APPROVED_AT: "2026-07-11T04:00:00.001Z",
      PRIVACY_OPERATIONS_OWNER: "owner-secret-001",
      PRIVACY_ATTESTED_SERVICE_VERSION_ID: "release-secret-001"
    });
    const issues = expectContactNotReady(
      env,
      "PRIVACY_OPERATIONS_APPROVED_AT"
    );
    const serialized = JSON.stringify(issues);

    for (const key of [...runtimeDeliveryKeys, ...attestationKeys]) {
      const value = env[key];
      if (value !== undefined) {
        expect(serialized).not.toContain(value);
      }
    }
  });
});

describe("contact collection server-only wrapper", () => {
  it("replays the current process environment through the pure evaluator", () => {
    const syntheticEnvironment = createReadyPrivacyEnv();
    const managedKeys = new Set([
      ...Object.keys(syntheticEnvironment),
      ...Object.keys(process.env).filter(
        (key) =>
          key.startsWith("PRIVACY_") ||
          key.startsWith("SMTP_") ||
          key.startsWith("EDGEONE_") ||
          key === "SERVICE_VERSION_ID" ||
          key === "CONTACT_TO_EMAIL" ||
          key === "NEXT_PUBLIC_SITE_URL"
      )
    ]);
    const originalValues = new Map(
      [...managedKeys].map((key) => [key, process.env[key]] as const)
    );

    vi.useFakeTimers();
    vi.setSystemTime(new Date(evaluationTime.nowIso));
    try {
      for (const key of managedKeys) {
        delete process.env[key];
      }
      for (const [key, value] of Object.entries(syntheticEnvironment)) {
        if (value !== undefined) {
          process.env[key] = value;
        }
      }

      const expectedReady = evaluateContactCollectionReadiness(
        process.env,
        createEvaluationTime(new Date())
      );
      expect(getContactCollectionReadiness()).toEqual(expectedReady);
      expect(expectedReady).toMatchObject({ ready: true });

      delete process.env.SMTP_PASS;
      const expectedUnready = evaluateContactCollectionReadiness(
        process.env,
        createEvaluationTime(new Date())
      );
      expect(getContactCollectionReadiness()).toEqual(expectedUnready);
      expect(expectedUnready).toMatchObject({ ready: false });
    } finally {
      for (const key of managedKeys) {
        delete process.env[key];
      }
      for (const [key, value] of originalValues) {
        if (value !== undefined) {
          process.env[key] = value;
        }
      }
      vi.useRealTimers();
    }
  });

  it("reads a new system time on every invocation", () => {
    const syntheticEnvironment = createReadyPrivacyEnv();
    const managedKeys = new Set([
      ...Object.keys(syntheticEnvironment),
      ...Object.keys(process.env).filter(
        (key) =>
          key.startsWith("PRIVACY_") ||
          key.startsWith("SMTP_") ||
          key.startsWith("EDGEONE_") ||
          key === "SERVICE_VERSION_ID" ||
          key === "CONTACT_TO_EMAIL" ||
          key === "NEXT_PUBLIC_SITE_URL"
      )
    ]);
    const originalValues = new Map(
      [...managedKeys].map((key) => [key, process.env[key]] as const)
    );

    vi.useFakeTimers();
    try {
      for (const key of managedKeys) {
        delete process.env[key];
      }
      for (const [key, value] of Object.entries(syntheticEnvironment)) {
        if (value !== undefined) {
          process.env[key] = value;
        }
      }

      vi.setSystemTime(new Date("2026-07-11T02:59:59.999Z"));
      expect(getContactCollectionReadiness()).toMatchObject({ ready: false });

      vi.setSystemTime(new Date("2026-07-11T03:00:00.001Z"));
      expect(getContactCollectionReadiness()).toMatchObject({ ready: true });
    } finally {
      for (const key of managedKeys) {
        delete process.env[key];
      }
      for (const [key, value] of originalValues) {
        if (value !== undefined) {
          process.env[key] = value;
        }
      }
      vi.useRealTimers();
    }
  });
});
