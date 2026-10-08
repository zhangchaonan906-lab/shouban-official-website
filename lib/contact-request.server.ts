import "server-only";

import {
  contactFieldLimits,
  contactPolicyMetadataLimits,
  validateContactForm,
  type ContactFormErrors,
  type ContactFormValues,
  type ContactPolicySubmissionMetadata
} from "@/lib/contact";

export const CONTACT_MAX_BODY_BYTES = 16_384;

export type ContactErrorCode =
  | "CONTACT_UNSUPPORTED_MEDIA_TYPE"
  | "CONTACT_ORIGIN_FORBIDDEN"
  | "CONTACT_BODY_TOO_LARGE"
  | "CONTACT_INVALID_JSON"
  | "CONTACT_INVALID_BODY"
  | "CONTACT_VALIDATION_FAILED";

export type ContactErrorEnvelope = {
  ok: false;
  code: ContactErrorCode;
  message: string;
  errors?: ContactFormErrors;
};

type ContactRequestFailure = {
  ok: false;
  status: 400 | 403 | 413 | 415;
  body: ContactErrorEnvelope;
};

type ContactHoneypotSuccess = {
  ok: true;
  honeypot: true;
  values: ContactFormValues;
};

type ContactHumanSuccess = {
  ok: true;
  honeypot: false;
  values: ContactFormValues;
  policyMetadata: ContactPolicySubmissionMetadata;
};

type ContactRequestSuccess = ContactHoneypotSuccess | ContactHumanSuccess;

export type ContactRequestResult = ContactRequestFailure | ContactRequestSuccess;

function failure(
  status: ContactRequestFailure["status"],
  code: ContactErrorCode,
  message: string,
  errors?: ContactFormErrors
): ContactRequestFailure {
  return {
    ok: false,
    status,
    body: {
      ok: false,
      code,
      message,
      ...(errors ? { errors } : {})
    }
  };
}

function isJsonContentType(contentType: string | null) {
  return contentType?.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

function hasAllowedOrigin(request: Request, allowedOrigin: string) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return false;
  }

  try {
    const parsedAllowedOrigin = new URL(allowedOrigin);

    return parsedAllowedOrigin.origin === allowedOrigin && origin === allowedOrigin;
  } catch {
    return false;
  }
}

type BodyReadResult =
  | { ok: true; text: string }
  | { ok: false; tooLarge: boolean };

async function readBodyWithinLimit(request: Request): Promise<BodyReadResult> {
  const declaredLength = request.headers.get("content-length");

  if (declaredLength) {
    const parsedLength = Number.parseInt(declaredLength, 10);

    if (Number.isFinite(parsedLength) && parsedLength > CONTACT_MAX_BODY_BYTES) {
      return { ok: false, tooLarge: true };
    }
  }

  if (!request.body) {
    return { ok: true, text: "" };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.byteLength;
      if (totalBytes > CONTACT_MAX_BODY_BYTES) {
        await reader.cancel();
        return { ok: false, tooLarge: true };
      }

      chunks.push(value);
    }
  } catch {
    return { ok: false, tooLarge: false };
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return {
      ok: true,
      text: new TextDecoder("utf-8", { fatal: true }).decode(bytes)
    };
  } catch {
    return { ok: false, tooLarge: false };
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function toContactFormValues(body: Record<string, unknown>): ContactFormValues {
  const stringValue = (value: unknown) => (typeof value === "string" ? value : "");

  return {
    name: stringValue(body.name),
    phone: stringValue(body.phone),
    organization: stringValue(body.organization),
    email: stringValue(body.email),
    customerType: stringValue(body.customerType),
    needType: stringValue(body.needType),
    assetType: stringValue(body.assetType),
    platformUrl: stringValue(body.platformUrl),
    message: stringValue(body.message),
    consent: body.consent === true
  };
}

type PolicyMetadataParseResult =
  | { ok: true; policyMetadata: ContactPolicySubmissionMetadata }
  | { ok: false };

function parsePolicyMetadata(body: Record<string, unknown>): PolicyMetadataParseResult {
  const policyMetadata: ContactPolicySubmissionMetadata = {
    privacyPolicyVersion: "",
    privacyPolicyEffectiveDate: "",
    privacyPolicySnapshotId: ""
  };
  const fields = [
    ["privacyPolicyVersion", "version"],
    ["privacyPolicyEffectiveDate", "effectiveDate"],
    ["privacyPolicySnapshotId", "snapshotId"]
  ] as const satisfies ReadonlyArray<
    readonly [
      keyof ContactPolicySubmissionMetadata,
      keyof typeof contactPolicyMetadataLimits
    ]
  >;

  for (const [field, limitKey] of fields) {
    if (!Object.prototype.hasOwnProperty.call(body, field)) {
      continue;
    }

    const value = body[field];
    if (
      typeof value !== "string"
      || value.length > contactPolicyMetadataLimits[limitKey]
    ) {
      return { ok: false };
    }

    policyMetadata[field] = value;
  }

  return { ok: true, policyMetadata };
}

export async function parseContactRequest(
  request: Request,
  allowedOrigin: string
): Promise<ContactRequestResult> {
  if (!isJsonContentType(request.headers.get("content-type"))) {
    return failure(
      415,
      "CONTACT_UNSUPPORTED_MEDIA_TYPE",
      "仅支持 application/json 请求"
    );
  }

  if (!hasAllowedOrigin(request, allowedOrigin)) {
    return failure(403, "CONTACT_ORIGIN_FORBIDDEN", "请求来源无效");
  }

  const bodyRead = await readBodyWithinLimit(request);
  if (!bodyRead.ok) {
    return bodyRead.tooLarge
      ? failure(413, "CONTACT_BODY_TOO_LARGE", "请求内容过大")
      : failure(400, "CONTACT_INVALID_BODY", "请求内容无效");
  }

  let body: unknown;

  try {
    body = JSON.parse(bodyRead.text) as unknown;
  } catch {
    return failure(400, "CONTACT_INVALID_JSON", "请求 JSON 格式无效");
  }

  if (!isPlainObject(body)) {
    return failure(400, "CONTACT_INVALID_BODY", "请求内容无效");
  }

  if (body.website !== undefined && typeof body.website !== "string") {
    return failure(400, "CONTACT_INVALID_BODY", "请求内容无效");
  }

  if (
    typeof body.website === "string"
    && body.website.length > contactFieldLimits.website
  ) {
    return failure(400, "CONTACT_INVALID_BODY", "请求内容无效");
  }

  const values = toContactFormValues(body);
  if (typeof body.website === "string" && body.website.length > 0) {
    return { ok: true, honeypot: true, values };
  }

  const policyMetadataResult = parsePolicyMetadata(body);
  if (!policyMetadataResult.ok) {
    return failure(400, "CONTACT_INVALID_BODY", "请求内容无效");
  }

  const validation = validateContactForm(values);
  if (!validation.success) {
    return failure(
      400,
      "CONTACT_VALIDATION_FAILED",
      "请检查并完善表单内容",
      validation.errors
    );
  }

  return {
    ok: true,
    honeypot: false,
    values,
    policyMetadata: policyMetadataResult.policyMetadata
  };
}
