import {
  evaluateContactCollectionReadiness,
  evaluatePrivacyPublicConfig,
  type ContactCollectionReadiness,
  type EvaluationTime
} from "../lib/privacy-readiness.mjs";

type PrivacyEnvironment = Record<string, string | undefined>;

export const privacyEvaluationTime = {
  nowIso: "2026-07-11T04:00:00.000Z",
  beijingDate: "2026-07-11"
} as const satisfies EvaluationTime;

const publicPrivacyEnvironment = {
  NEXT_PUBLIC_SITE_URL: "https://www.shouban.test",
  PRIVACY_CONTACT_EMAIL: "privacy@shouban.test",
  PRIVACY_POLICY_EFFECTIVE_DATE: "2026-07-11",
  PRIVACY_HOSTING_PROVIDER_NAME: "腾讯云",
  PRIVACY_HOSTING_PRODUCT_NAME: "轻量应用服务器 Lighthouse",
  PRIVACY_HOSTING_LOCATION: "中国大陆（北京）",
  PRIVACY_SMTP_RELAY_PROVIDER_NAME: "测试企业邮件服务",
  PRIVACY_SMTP_RELAY_LOCATION: "中国大陆（北京）",
  PRIVACY_CONTACT_MAILBOX_PROVIDER_NAME: "测试企业邮件服务",
  PRIVACY_CONTACT_MAILBOX_LOCATION: "中国大陆（北京）",
  PRIVACY_RIGHTS_MAILBOX_PROVIDER_NAME: "测试企业邮件服务",
  PRIVACY_RIGHTS_MAILBOX_LOCATION: "中国大陆（北京）",
  PRIVACY_MAIL_DELETION_METHOD:
    "删除收件箱、已发送、回收站及受控副本，并按服务商备份到期机制清除"
} as const satisfies PrivacyEnvironment;

export function createPrivacyTestEnv(
  overrides: PrivacyEnvironment = {}
): PrivacyEnvironment {
  return { ...publicPrivacyEnvironment, ...overrides };
}

export function createReadyPrivacyEnv(
  overrides: PrivacyEnvironment = {}
): PrivacyEnvironment {
  const publicEnvironment = createPrivacyTestEnv(overrides);
  const publicResult = evaluatePrivacyPublicConfig(
    publicEnvironment,
    privacyEvaluationTime
  );

  if (!publicResult.ok) {
    throw new Error("Synthetic public privacy fixture must be valid");
  }

  return {
    ...publicEnvironment,
    SERVICE_VERSION_ID: "release-2026-07-11-001",
    PRIVACY_OPERATIONS_ATTESTATION_ID: "ops-attestation-001",
    PRIVACY_OPERATIONS_APPROVED_AT: "2026-07-11T03:00:00.000Z",
    PRIVACY_OPERATIONS_OWNER: "privacy-operations-owner",
    PRIVACY_ATTESTED_SERVICE_VERSION_ID: "release-2026-07-11-001",
    PRIVACY_ATTESTED_SITE_ORIGIN: "https://www.shouban.test",
    PRIVACY_ATTESTED_PUBLIC_SNAPSHOT_ID:
      publicResult.publicConfig.privacyPolicySnapshotId,
    CONTACT_TO_EMAIL: "contact@shouban.test",
    SMTP_HOST: "smtp.shouban.test",
    SMTP_PORT: "587",
    SMTP_USER: "smtp-user",
    SMTP_PASS: "SENTINEL_SMTP_PASSWORD",
    SMTP_FROM: "首版认证 <contact@shouban.test>",
    ...overrides
  };
}

export function getReadyPrivacyResult(
  overrides: PrivacyEnvironment = {}
): ContactCollectionReadiness {
  return evaluateContactCollectionReadiness(
    createReadyPrivacyEnv(overrides),
    privacyEvaluationTime
  );
}
