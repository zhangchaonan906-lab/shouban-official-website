export type EvaluationTime = {
  readonly nowIso: string;
  readonly beijingDate: string;
};

export type PrivacyReadinessIssueCode =
  | "PRIVACY_CONFIG_MISSING"
  | "PRIVACY_CONFIG_PLACEHOLDER"
  | "PRIVACY_CONFIG_INVALID_SITE_ORIGIN"
  | "PRIVACY_CONFIG_INVALID_EMAIL"
  | "PRIVACY_CONFIG_INVALID_EFFECTIVE_DATE"
  | "PRIVACY_CONFIG_FUTURE_EFFECTIVE_DATE"
  | "PRIVACY_CONFIG_MAIL_LOCATION_NOT_MAINLAND"
  | "PRIVACY_EDGEONE_INCOMPLETE"
  | "PRIVACY_EDGEONE_INVALID_VERIFIED_AT"
  | "PRIVACY_EDGEONE_FUTURE_VERIFIED_AT"
  | "PRIVACY_EDGEONE_SITE_ID_MISMATCH"
  | "PRIVACY_EDGEONE_RATE_LIMIT_RULE_ID_MISMATCH"
  | "PRIVACY_EDGEONE_ORIGIN_MISMATCH"
  | "PRIVACY_EDGEONE_INVALID_LOG_RETENTION"
  | "PRIVACY_CONFIG_INVALID_SMTP_HOST"
  | "PRIVACY_CONFIG_INVALID_SMTP_PORT"
  | "PRIVACY_CONFIG_INVALID_SMTP_FROM"
  | "PRIVACY_ATTESTATION_INVALID_APPROVED_AT"
  | "PRIVACY_ATTESTATION_FUTURE_APPROVED_AT"
  | "PRIVACY_ATTESTATION_SERVICE_VERSION_MISMATCH"
  | "PRIVACY_ATTESTATION_INVALID_PUBLIC_SNAPSHOT_ID"
  | "PRIVACY_ATTESTATION_SITE_ORIGIN_MISMATCH"
  | "PRIVACY_ATTESTATION_PUBLIC_SNAPSHOT_MISMATCH";

export type PrivacyReadinessIssue = {
  readonly code: PrivacyReadinessIssueCode;
  readonly key: string;
};

export type EffectivePrivacyConfig = {
  readonly policyVersion: "1.0";
  readonly effectiveDate: string;
  readonly siteOrigin: string;
  readonly processorName: "北京首版认证有限公司";
  readonly privacyContactEmail: string;
  readonly hosting: {
    readonly providerName: string;
    readonly productName: string;
    readonly location: string;
  };
  readonly mail: {
    readonly smtpRelay: {
      readonly providerName: string;
      readonly location: string;
    };
    readonly contactMailbox: {
      readonly providerName: string;
      readonly location: string;
    };
    readonly rightsMailbox: {
      readonly providerName: string;
      readonly location: string;
    };
    readonly deletionMethod: string;
  };
  readonly retention: {
    readonly unconvertedInquiryDays: 180;
    readonly applicationLogDays: 30;
    readonly rightsRecordDays: 180;
  };
  readonly rightsResponseWorkingDays: 15;
  readonly childAgeThreshold: 14;
  readonly edgeOne:
    | { readonly enabled: false }
    | {
        readonly enabled: true;
        readonly logRetentionDays: number;
        readonly logStorageLocation: string;
      };
  readonly privacyPolicySnapshotId: string;
};

export type PrivacyPublicConfigResult =
  | {
      readonly ok: false;
      readonly issues: readonly PrivacyReadinessIssue[];
    }
  | {
      readonly ok: true;
      readonly publicConfig: EffectivePrivacyConfig;
    };

export type ContactCollectionReadiness =
  | {
      ready: true;
      publicConfig: EffectivePrivacyConfig;
    }
  | {
      ready: false;
      issues: PrivacyReadinessIssue[];
    };

export type CanonicalJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly CanonicalJsonValue[]
  | { readonly [key: string]: CanonicalJsonValue };

export type PrivacyPublicEnvironment = Readonly<
  Record<string, string | undefined>
>;

export declare function createEvaluationTime(now?: Date): EvaluationTime;
export declare function canonicalJson(value: CanonicalJsonValue): string;
export declare function createPrivacyPolicySnapshotId(
  publicFacts: CanonicalJsonValue
): string;
export declare function evaluatePrivacyPublicConfig(
  env: PrivacyPublicEnvironment,
  time: EvaluationTime
): PrivacyPublicConfigResult;
export declare function evaluateContactCollectionReadiness(
  env: PrivacyPublicEnvironment,
  time: EvaluationTime
): ContactCollectionReadiness;
