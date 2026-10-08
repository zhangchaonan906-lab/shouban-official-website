import "server-only";

import {
  buildContactEmail,
  type ContactEmailServerContext
} from "@/lib/contact-email";
import {
  parseContactRequest,
  type ContactErrorCode
} from "@/lib/contact-request.server";
import { CONTACT_MAIL_NOT_CONFIGURED, sendContactEmail } from "@/lib/mail";
import { getContactCollectionReadiness } from "@/lib/privacy-readiness.server";

export const runtime = "nodejs";

const SUCCESS_MESSAGE = "提交成功，首版认证工作人员会在后续与您联系并跟进需求。";
const CACHE_CONTROL = "private, no-store, max-age=0";

type RouteErrorCode =
  | "CONTACT_PRIVACY_NOT_READY"
  | "CONTACT_POLICY_VERSION_MISMATCH"
  | "CONTACT_MAIL_NOT_CONFIGURED"
  | "CONTACT_MAIL_FAILED";

type RouteOutcome =
  | "CONTACT_ACCEPTED"
  | "CONTACT_HONEYPOT_FILTERED"
  | RouteErrorCode
  | ContactErrorCode;

function logOutcome(
  requestId: string,
  outcome: RouteOutcome,
  status: number,
  startedAt: number
) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  console.info("contact_request", {
    requestId,
    outcome,
    status,
    durationMs: Date.now() - startedAt
  });
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", CACHE_CONTROL);

  return Response.json(body, { ...init, headers });
}

function successResponse() {
  return jsonResponse({ ok: true, message: SUCCESS_MESSAGE });
}

function errorResponse(
  status: 409 | 502 | 503,
  code: RouteErrorCode,
  message: string
) {
  return jsonResponse(
    {
      ok: false,
      code,
      message
    },
    { status }
  );
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  const receivedAt = new Date().toISOString();
  const readiness = getContactCollectionReadiness();

  if (!readiness.ready) {
    logOutcome(requestId, "CONTACT_PRIVACY_NOT_READY", 503, startedAt);
    return errorResponse(
      503,
      "CONTACT_PRIVACY_NOT_READY",
      "在线联系功能暂未开放"
    );
  }

  const parsed = await parseContactRequest(
    request,
    readiness.publicConfig.siteOrigin
  );

  if (!parsed.ok) {
    logOutcome(requestId, parsed.body.code, parsed.status, startedAt);
    return jsonResponse(parsed.body, { status: parsed.status });
  }

  if (parsed.honeypot) {
    logOutcome(requestId, "CONTACT_HONEYPOT_FILTERED", 200, startedAt);
    return successResponse();
  }

  const policyIsCurrent =
    parsed.policyMetadata.privacyPolicyVersion
      === readiness.publicConfig.policyVersion
    && parsed.policyMetadata.privacyPolicyEffectiveDate
      === readiness.publicConfig.effectiveDate
    && parsed.policyMetadata.privacyPolicySnapshotId
      === readiness.publicConfig.privacyPolicySnapshotId;

  if (!policyIsCurrent) {
    logOutcome(requestId, "CONTACT_POLICY_VERSION_MISMATCH", 409, startedAt);
    return errorResponse(
      409,
      "CONTACT_POLICY_VERSION_MISMATCH",
      "隐私政策已更新，请刷新页面后重新确认"
    );
  }

  const emailContext: ContactEmailServerContext = {
    requestId,
    receivedAt,
    privacyPolicyVersion: readiness.publicConfig.policyVersion,
    privacyPolicyEffectiveDate: readiness.publicConfig.effectiveDate,
    privacyPolicySnapshotId: readiness.publicConfig.privacyPolicySnapshotId
  };

  try {
    await sendContactEmail(buildContactEmail(parsed.values, emailContext));
  } catch (error) {
    if (error instanceof Error && error.message === CONTACT_MAIL_NOT_CONFIGURED) {
      logOutcome(requestId, "CONTACT_MAIL_NOT_CONFIGURED", 503, startedAt);
      return errorResponse(
        503,
        "CONTACT_MAIL_NOT_CONFIGURED",
        "联系表单邮件服务未配置"
      );
    }

    logOutcome(requestId, "CONTACT_MAIL_FAILED", 502, startedAt);
    return errorResponse(502, "CONTACT_MAIL_FAILED", "联系表单邮件发送失败");
  }

  logOutcome(requestId, "CONTACT_ACCEPTED", 200, startedAt);
  return successResponse();
}
