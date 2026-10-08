import { createHash } from "node:crypto";
import {
  PRIVACY_POLICY_CONSENT_CONTRACT,
  PUBLIC_PRIVACY_POLICY
} from "./privacy-policy.mjs";

const REQUIRED_PUBLIC_KEYS = Object.freeze([
  "NEXT_PUBLIC_SITE_URL",
  "PRIVACY_CONTACT_EMAIL",
  "PRIVACY_POLICY_EFFECTIVE_DATE",
  "PRIVACY_HOSTING_PROVIDER_NAME",
  "PRIVACY_HOSTING_PRODUCT_NAME",
  "PRIVACY_HOSTING_LOCATION",
  "PRIVACY_SMTP_RELAY_PROVIDER_NAME",
  "PRIVACY_SMTP_RELAY_LOCATION",
  "PRIVACY_CONTACT_MAILBOX_PROVIDER_NAME",
  "PRIVACY_CONTACT_MAILBOX_LOCATION",
  "PRIVACY_RIGHTS_MAILBOX_PROVIDER_NAME",
  "PRIVACY_RIGHTS_MAILBOX_LOCATION",
  "PRIVACY_MAIL_DELETION_METHOD"
]);

const MAIL_LOCATION_KEYS = Object.freeze([
  "PRIVACY_SMTP_RELAY_LOCATION",
  "PRIVACY_CONTACT_MAILBOX_LOCATION",
  "PRIVACY_RIGHTS_MAILBOX_LOCATION"
]);

const REQUIRED_RUNTIME_DELIVERY_KEYS = Object.freeze([
  "CONTACT_TO_EMAIL",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "NEXT_PUBLIC_SITE_URL"
]);

const REQUIRED_ATTESTATION_KEYS = Object.freeze([
  "SERVICE_VERSION_ID",
  "PRIVACY_OPERATIONS_ATTESTATION_ID",
  "PRIVACY_OPERATIONS_APPROVED_AT",
  "PRIVACY_OPERATIONS_OWNER",
  "PRIVACY_ATTESTED_SERVICE_VERSION_ID",
  "PRIVACY_ATTESTED_SITE_ORIGIN",
  "PRIVACY_ATTESTED_PUBLIC_SNAPSHOT_ID"
]);

const EDGEONE_KEYS = Object.freeze([
  "EDGEONE_VERIFIED_AT",
  "EDGEONE_VERIFICATION_ID",
  "EDGEONE_SITE_ID",
  "EDGEONE_RATE_LIMIT_RULE_ID",
  "EDGEONE_VERIFIED_SITE_ID",
  "EDGEONE_VERIFIED_RATE_LIMIT_RULE_ID",
  "EDGEONE_VERIFIED_ORIGIN",
  "EDGEONE_LOG_RETENTION_DAYS",
  "EDGEONE_LOG_STORAGE_LOCATION"
]);

export function createEvaluationTime(now = new Date()) {
  const beijingDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);

  return { nowIso: now.toISOString(), beijingDate };
}

function serializeCanonicalJson(value, ancestors) {
  if (value === null) {
    return "null";
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Canonical JSON numbers must be finite");
    }
    return JSON.stringify(value);
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (typeof value !== "object") {
    throw new TypeError("Unsupported canonical JSON value");
  }

  const isArray = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if (!isArray && prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Canonical JSON objects must be plain objects");
  }
  if (ancestors.has(value)) {
    throw new TypeError("Canonical JSON cannot contain cycles");
  }

  ancestors.add(value);
  try {
    if (isArray) {
      const items = [];
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) {
          throw new TypeError("Canonical JSON arrays cannot be sparse");
        }
        items.push(serializeCanonicalJson(value[index], ancestors));
      }
      return `[${items.join(",")}]`;
    }

    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${serializeCanonicalJson(value[key], ancestors)}`
      )
      .join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
}

export function canonicalJson(value) {
  return serializeCanonicalJson(value, new Set());
}

export function createPrivacyPolicySnapshotId(publicFacts) {
  return createHash("sha256")
    .update(canonicalJson(publicFacts), "utf8")
    .digest("hex");
}

function trimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isPlaceholder(value) {
  const normalized = value.trim().toLocaleLowerCase("en-US");

  return (
    normalized === "" ||
    normalized === "待公司确认" ||
    normalized === "待开通" ||
    normalized === "change-me" ||
    normalized.includes("example.com")
  );
}

function isValidCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function parseIsoInstant(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(
    value
  );

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second, offsetHour, offsetMinute] = match;
  if (
    !isValidCalendarDate(`${year}-${month}-${day}`) ||
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second) > 59 ||
    (offsetHour !== undefined && Number(offsetHour) > 23) ||
    (offsetMinute !== undefined && Number(offsetMinute) > 59)
  ) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function exactHttpsOrigin(value) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username !== "" ||
      url.password !== "" ||
      value !== url.origin
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function isValidEmail(value) {
  if (value.length > 254) {
    return false;
  }

  const separatorIndex = value.indexOf("@");
  if (separatorIndex <= 0 || separatorIndex !== value.lastIndexOf("@")) {
    return false;
  }

  const local = value.slice(0, separatorIndex);
  const domain = value.slice(separatorIndex + 1);
  if (local.length > 64 || domain.length === 0 || domain.length > 253) {
    return false;
  }

  const localAtoms = local.split(".");
  if (
    localAtoms.some(
      (atom) => atom.length === 0 || !/^[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+$/.test(atom)
    )
  ) {
    return false;
  }

  const domainLabels = domain.split(".");
  return (
    domainLabels.length >= 2 &&
    domainLabels.every(
      (label) =>
        label.length <= 63 &&
        /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label)
    )
  );
}

function isValidDnsHostname(value) {
  if (value.length > 253 || /^\d+(?:\.\d+){3}$/.test(value)) {
    return false;
  }

  const labels = value.split(".");
  return (
    labels.length >= 2 &&
    labels.every(
      (label) =>
        label.length <= 63 &&
        /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label)
    ) &&
    /[A-Za-z]/.test(labels.at(-1))
  );
}

function isValidFromAddress(value) {
  if (isValidEmail(value)) {
    return true;
  }

  if (/[\u0000-\u001F\u007F]/.test(value)) {
    return false;
  }

  const displayAddress = /^([^<>\r\n]+?)\s+<([^<>\r\n]+)>$/.exec(value);
  if (displayAddress === null) {
    return false;
  }

  const displayName = displayAddress[1].trim();
  const mailbox = displayAddress[2];
  return (
    displayName !== "" &&
    !/[@,;:<>]/.test(displayName) &&
    mailbox === mailbox.trim() &&
    isValidEmail(mailbox)
  );
}

function evaluateEdgeOne(env, siteOrigin, nowIso, addIssue) {
  const presentKeys = EDGEONE_KEYS.filter((key) => trimmedString(env[key]) !== "");

  if (presentKeys.length === 0) {
    return { enabled: false };
  }

  if (presentKeys.length !== EDGEONE_KEYS.length) {
    for (const key of EDGEONE_KEYS) {
      if (trimmedString(env[key]) === "") {
        addIssue("PRIVACY_EDGEONE_INCOMPLETE", key);
      }
    }
    return null;
  }

  const values = Object.fromEntries(
    EDGEONE_KEYS.map((key) => [key, trimmedString(env[key])])
  );

  for (const key of EDGEONE_KEYS) {
    if (isPlaceholder(values[key])) {
      addIssue("PRIVACY_CONFIG_PLACEHOLDER", key);
    }
  }

  const verifiedAt = parseIsoInstant(values.EDGEONE_VERIFIED_AT);
  const now = parseIsoInstant(nowIso);
  if (verifiedAt === null) {
    addIssue("PRIVACY_EDGEONE_INVALID_VERIFIED_AT", "EDGEONE_VERIFIED_AT");
  } else if (now === null || verifiedAt > now) {
    addIssue("PRIVACY_EDGEONE_FUTURE_VERIFIED_AT", "EDGEONE_VERIFIED_AT");
  }

  if (values.EDGEONE_SITE_ID !== values.EDGEONE_VERIFIED_SITE_ID) {
    addIssue("PRIVACY_EDGEONE_SITE_ID_MISMATCH", "EDGEONE_VERIFIED_SITE_ID");
  }

  if (
    values.EDGEONE_RATE_LIMIT_RULE_ID !==
    values.EDGEONE_VERIFIED_RATE_LIMIT_RULE_ID
  ) {
    addIssue(
      "PRIVACY_EDGEONE_RATE_LIMIT_RULE_ID_MISMATCH",
      "EDGEONE_VERIFIED_RATE_LIMIT_RULE_ID"
    );
  }

  if (siteOrigin !== undefined && values.EDGEONE_VERIFIED_ORIGIN !== siteOrigin) {
    addIssue("PRIVACY_EDGEONE_ORIGIN_MISMATCH", "EDGEONE_VERIFIED_ORIGIN");
  }

  const logRetentionDays = Number(values.EDGEONE_LOG_RETENTION_DAYS);
  if (
    !/^[1-9]\d*$/.test(values.EDGEONE_LOG_RETENTION_DAYS) ||
    !Number.isSafeInteger(logRetentionDays)
  ) {
    addIssue(
      "PRIVACY_EDGEONE_INVALID_LOG_RETENTION",
      "EDGEONE_LOG_RETENTION_DAYS"
    );
  }

  return {
    enabled: true,
    logRetentionDays,
    logStorageLocation: values.EDGEONE_LOG_STORAGE_LOCATION
  };
}

function createSnapshotFacts(publicConfig) {
  return {
    policyVersion: publicConfig.policyVersion,
    effectiveDate: publicConfig.effectiveDate,
    siteOrigin: publicConfig.siteOrigin,
    processorName: publicConfig.processorName,
    privacyContactEmail: publicConfig.privacyContactEmail,
    consentContract: PRIVACY_POLICY_CONSENT_CONTRACT,
    hosting: publicConfig.hosting,
    mail: publicConfig.mail,
    retention: publicConfig.retention,
    rights: {
      responseWorkingDays: publicConfig.rightsResponseWorkingDays,
      recordRetentionDays: publicConfig.retention.rightsRecordDays
    },
    childAgeThreshold: publicConfig.childAgeThreshold,
    edgeOne: publicConfig.edgeOne
  };
}

export function evaluatePrivacyPublicConfig(env, time) {
  const issues = [];
  const issueKeys = new Set();
  const values = {};

  const addIssue = (code, key) => {
    const identity = `${code}:${key}`;
    if (!issueKeys.has(identity)) {
      issueKeys.add(identity);
      issues.push({ code, key });
    }
  };

  for (const key of REQUIRED_PUBLIC_KEYS) {
    const value = trimmedString(env[key]);
    if (value === "") {
      addIssue("PRIVACY_CONFIG_MISSING", key);
      continue;
    }
    if (isPlaceholder(value)) {
      addIssue("PRIVACY_CONFIG_PLACEHOLDER", key);
      continue;
    }
    values[key] = value;
  }

  let siteOrigin;
  if (values.NEXT_PUBLIC_SITE_URL !== undefined) {
    siteOrigin = exactHttpsOrigin(values.NEXT_PUBLIC_SITE_URL) ?? undefined;
    if (siteOrigin === undefined) {
      addIssue("PRIVACY_CONFIG_INVALID_SITE_ORIGIN", "NEXT_PUBLIC_SITE_URL");
    }
  }

  if (
    values.PRIVACY_CONTACT_EMAIL !== undefined &&
    !isValidEmail(values.PRIVACY_CONTACT_EMAIL)
  ) {
    addIssue("PRIVACY_CONFIG_INVALID_EMAIL", "PRIVACY_CONTACT_EMAIL");
  }

  if (values.PRIVACY_POLICY_EFFECTIVE_DATE !== undefined) {
    if (!isValidCalendarDate(values.PRIVACY_POLICY_EFFECTIVE_DATE)) {
      addIssue(
        "PRIVACY_CONFIG_INVALID_EFFECTIVE_DATE",
        "PRIVACY_POLICY_EFFECTIVE_DATE"
      );
    } else if (values.PRIVACY_POLICY_EFFECTIVE_DATE > time.beijingDate) {
      addIssue(
        "PRIVACY_CONFIG_FUTURE_EFFECTIVE_DATE",
        "PRIVACY_POLICY_EFFECTIVE_DATE"
      );
    }
  }

  for (const key of MAIL_LOCATION_KEYS) {
    if (values[key] !== undefined && !values[key].startsWith("中国大陆")) {
      addIssue("PRIVACY_CONFIG_MAIL_LOCATION_NOT_MAINLAND", key);
    }
  }

  const edgeOne = evaluateEdgeOne(env, siteOrigin, time.nowIso, addIssue);

  if (issues.length > 0 || siteOrigin === undefined || edgeOne === null) {
    return { ok: false, issues };
  }

  const publicConfigWithoutSnapshot = {
    policyVersion: PUBLIC_PRIVACY_POLICY.version,
    effectiveDate: values.PRIVACY_POLICY_EFFECTIVE_DATE,
    siteOrigin,
    processorName: PUBLIC_PRIVACY_POLICY.processorName,
    privacyContactEmail: values.PRIVACY_CONTACT_EMAIL,
    hosting: {
      providerName: values.PRIVACY_HOSTING_PROVIDER_NAME,
      productName: values.PRIVACY_HOSTING_PRODUCT_NAME,
      location: values.PRIVACY_HOSTING_LOCATION
    },
    mail: {
      smtpRelay: {
        providerName: values.PRIVACY_SMTP_RELAY_PROVIDER_NAME,
        location: values.PRIVACY_SMTP_RELAY_LOCATION
      },
      contactMailbox: {
        providerName: values.PRIVACY_CONTACT_MAILBOX_PROVIDER_NAME,
        location: values.PRIVACY_CONTACT_MAILBOX_LOCATION
      },
      rightsMailbox: {
        providerName: values.PRIVACY_RIGHTS_MAILBOX_PROVIDER_NAME,
        location: values.PRIVACY_RIGHTS_MAILBOX_LOCATION
      },
      deletionMethod: values.PRIVACY_MAIL_DELETION_METHOD
    },
    retention: {
      unconvertedInquiryDays: PUBLIC_PRIVACY_POLICY.unconvertedInquiryRetentionDays,
      applicationLogDays: PUBLIC_PRIVACY_POLICY.applicationLogRetentionDays,
      rightsRecordDays: PUBLIC_PRIVACY_POLICY.rightsRecordRetentionDays
    },
    rightsResponseWorkingDays: PUBLIC_PRIVACY_POLICY.rightsResponseWorkingDays,
    childAgeThreshold: PUBLIC_PRIVACY_POLICY.childAgeThreshold,
    edgeOne
  };

  return {
    ok: true,
    publicConfig: {
      ...publicConfigWithoutSnapshot,
      privacyPolicySnapshotId: createPrivacyPolicySnapshotId(
        createSnapshotFacts(publicConfigWithoutSnapshot)
      )
    }
  };
}

export function evaluateContactCollectionReadiness(env, time) {
  const publicResult = evaluatePrivacyPublicConfig(env, time);
  const issues = [];
  const issueKeys = new Set();
  const runtimeValues = {};
  const attestationValues = {};

  const addIssue = (code, key) => {
    const identity = `${code}:${key}`;
    if (!issueKeys.has(identity)) {
      issueKeys.add(identity);
      issues.push({ code, key });
    }
  };

  if (!publicResult.ok) {
    for (const issue of publicResult.issues) {
      addIssue(issue.code, issue.key);
    }
  }

  for (const key of REQUIRED_RUNTIME_DELIVERY_KEYS) {
    const value = trimmedString(env[key]);
    if (value === "") {
      addIssue("PRIVACY_CONFIG_MISSING", key);
      continue;
    }
    if (isPlaceholder(value)) {
      addIssue("PRIVACY_CONFIG_PLACEHOLDER", key);
    }
    runtimeValues[key] = value;
  }

  const contactToEmail = env.CONTACT_TO_EMAIL;
  if (
    runtimeValues.CONTACT_TO_EMAIL !== undefined &&
    (typeof contactToEmail !== "string" ||
      contactToEmail !== contactToEmail.trim() ||
      !isValidEmail(contactToEmail))
  ) {
    addIssue("PRIVACY_CONFIG_INVALID_EMAIL", "CONTACT_TO_EMAIL");
  }

  const smtpHost = env.SMTP_HOST;
  if (
    runtimeValues.SMTP_HOST !== undefined &&
    (typeof smtpHost !== "string" ||
      smtpHost !== smtpHost.trim() ||
      /\s/.test(smtpHost) ||
      !isValidDnsHostname(smtpHost))
  ) {
    addIssue("PRIVACY_CONFIG_INVALID_SMTP_HOST", "SMTP_HOST");
  }

  if (
    runtimeValues.SMTP_PORT !== undefined &&
    runtimeValues.SMTP_PORT !== "465" &&
    runtimeValues.SMTP_PORT !== "587"
  ) {
    addIssue("PRIVACY_CONFIG_INVALID_SMTP_PORT", "SMTP_PORT");
  }

  const smtpFrom = env.SMTP_FROM;
  if (
    runtimeValues.SMTP_FROM !== undefined &&
    (typeof smtpFrom !== "string" ||
      smtpFrom !== smtpFrom.trim() ||
      !isValidFromAddress(smtpFrom))
  ) {
    addIssue("PRIVACY_CONFIG_INVALID_SMTP_FROM", "SMTP_FROM");
  }

  if (
    runtimeValues.NEXT_PUBLIC_SITE_URL !== undefined &&
    exactHttpsOrigin(runtimeValues.NEXT_PUBLIC_SITE_URL) === null
  ) {
    addIssue("PRIVACY_CONFIG_INVALID_SITE_ORIGIN", "NEXT_PUBLIC_SITE_URL");
  }

  for (const key of REQUIRED_ATTESTATION_KEYS) {
    const value = trimmedString(env[key]);
    if (value === "") {
      addIssue("PRIVACY_CONFIG_MISSING", key);
      continue;
    }
    if (isPlaceholder(value)) {
      addIssue("PRIVACY_CONFIG_PLACEHOLDER", key);
    }
    attestationValues[key] = value;
  }

  const approvedAt = attestationValues.PRIVACY_OPERATIONS_APPROVED_AT === undefined
    ? null
    : parseIsoInstant(attestationValues.PRIVACY_OPERATIONS_APPROVED_AT);
  if (
    attestationValues.PRIVACY_OPERATIONS_APPROVED_AT !== undefined &&
    approvedAt === null
  ) {
    addIssue(
      "PRIVACY_ATTESTATION_INVALID_APPROVED_AT",
      "PRIVACY_OPERATIONS_APPROVED_AT"
    );
  } else if (approvedAt !== null) {
    const now = parseIsoInstant(time.nowIso);
    if (now === null || approvedAt > now) {
      addIssue(
        "PRIVACY_ATTESTATION_FUTURE_APPROVED_AT",
        "PRIVACY_OPERATIONS_APPROVED_AT"
      );
    }
  }

  if (
    attestationValues.SERVICE_VERSION_ID !== undefined &&
    attestationValues.PRIVACY_ATTESTED_SERVICE_VERSION_ID !== undefined &&
    attestationValues.SERVICE_VERSION_ID !==
      attestationValues.PRIVACY_ATTESTED_SERVICE_VERSION_ID
  ) {
    addIssue(
      "PRIVACY_ATTESTATION_SERVICE_VERSION_MISMATCH",
      "PRIVACY_ATTESTED_SERVICE_VERSION_ID"
    );
  }

  if (
    attestationValues.PRIVACY_ATTESTED_SITE_ORIGIN !== undefined &&
    exactHttpsOrigin(attestationValues.PRIVACY_ATTESTED_SITE_ORIGIN) === null
  ) {
    addIssue(
      "PRIVACY_CONFIG_INVALID_SITE_ORIGIN",
      "PRIVACY_ATTESTED_SITE_ORIGIN"
    );
  }

  if (
    attestationValues.PRIVACY_ATTESTED_PUBLIC_SNAPSHOT_ID !== undefined &&
    !/^[a-f0-9]{64}$/.test(
      attestationValues.PRIVACY_ATTESTED_PUBLIC_SNAPSHOT_ID
    )
  ) {
    addIssue(
      "PRIVACY_ATTESTATION_INVALID_PUBLIC_SNAPSHOT_ID",
      "PRIVACY_ATTESTED_PUBLIC_SNAPSHOT_ID"
    );
  }

  if (publicResult.ok) {
    if (
      attestationValues.PRIVACY_ATTESTED_SITE_ORIGIN !== undefined &&
      attestationValues.PRIVACY_ATTESTED_SITE_ORIGIN !==
        publicResult.publicConfig.siteOrigin
    ) {
      addIssue(
        "PRIVACY_ATTESTATION_SITE_ORIGIN_MISMATCH",
        "PRIVACY_ATTESTED_SITE_ORIGIN"
      );
    }

    if (
      attestationValues.PRIVACY_ATTESTED_PUBLIC_SNAPSHOT_ID !== undefined &&
      attestationValues.PRIVACY_ATTESTED_PUBLIC_SNAPSHOT_ID !==
        publicResult.publicConfig.privacyPolicySnapshotId
    ) {
      addIssue(
        "PRIVACY_ATTESTATION_PUBLIC_SNAPSHOT_MISMATCH",
        "PRIVACY_ATTESTED_PUBLIC_SNAPSHOT_ID"
      );
    }
  }

  if (!publicResult.ok || issues.length > 0) {
    return { ready: false, issues };
  }

  return { ready: true, publicConfig: publicResult.publicConfig };
}
