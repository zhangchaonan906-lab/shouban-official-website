export type PrivacyPolicySectionId =
  | "controller"
  | "submitted-data"
  | "technical-data"
  | "processing-flow"
  | "processors"
  | "retention"
  | "rights"
  | "security"
  | "sensitive-and-children"
  | "updates";

export type PrivacyPolicySection = {
  readonly id: PrivacyPolicySectionId;
  readonly label: string;
};

export type PrivacyCollectionFieldKey =
  | "name"
  | "contactMethod"
  | "organization"
  | "customerType"
  | "needType"
  | "assetType"
  | "platformUrl"
  | "message"
  | "technical";

export type PrivacyCollectionField = {
  readonly key: PrivacyCollectionFieldKey;
  readonly label: string;
  readonly requiredness: string;
  readonly purpose: string;
  readonly processingMethod: string;
  readonly retentionKind: "inquiry" | "technical";
};

export type PrivacyPolicyConsentContract = {
  readonly sections: readonly PrivacyPolicySection[];
  readonly collectionFields: readonly PrivacyCollectionField[];
  readonly processing: {
    readonly primaryPurpose: string;
    readonly collectionNotice: string;
    readonly path: readonly string[];
    readonly method: string;
    readonly noWebsiteDatabase: string;
    readonly noAdvertisingOrUnrelatedMarketing: string;
    readonly priorNoticeForNewBasisOrConsent: string;
  };
  readonly technicalData: {
    readonly applicationLogs: {
      readonly categories: readonly string[];
      readonly exclusions: readonly string[];
      readonly purpose: string;
    };
    readonly reverseProxy: {
      readonly categories: readonly string[];
      readonly purpose: string;
    };
    readonly edgeOne: {
      readonly categories: readonly string[];
      readonly purpose: string;
    };
  };
  readonly retention: {
    readonly inquiryLabel: string;
    readonly formalRecordRule: string;
    readonly deletionRule: string;
    readonly deletionException: string;
    readonly restrictedUse: string;
    readonly rightsRecordRule: string;
  };
  readonly rights: {
    readonly commitments: readonly string[];
    readonly verification: string;
    readonly responseClock: string;
    readonly refusalNotice: string;
  };
  readonly security: {
    readonly commitments: readonly string[];
  };
  readonly children: {
    readonly notice: string;
    readonly discoveredDataAction: string;
    readonly legalRetentionException: string;
  };
  readonly updates: {
    readonly notice: string;
    readonly materialChangeTriggers: readonly string[];
    readonly reconsent: string;
  };
  readonly sensitiveMaterialWarning: string;
};

export type PublicPrivacyPolicy = {
  readonly version: "1.0";
  readonly processorName: "北京首版认证有限公司";
  readonly unconvertedInquiryRetentionDays: 180;
  readonly applicationLogRetentionDays: 30;
  readonly rightsRecordRetentionDays: 180;
  readonly rightsResponseWorkingDays: 15;
  readonly childAgeThreshold: 14;
  readonly rightsCommitments: readonly string[];
};

export declare const PRIVACY_POLICY_CONSENT_CONTRACT: PrivacyPolicyConsentContract;
export declare const PRIVACY_POLICY_SECTIONS: readonly PrivacyPolicySection[];
export declare const PRIVACY_COLLECTION_FIELDS: readonly PrivacyCollectionField[];
export declare const PUBLIC_PRIVACY_POLICY: PublicPrivacyPolicy;
export declare const SENSITIVE_MATERIAL_WARNING: string;
export declare const CHILD_CONTACT_NOTICE: string;
