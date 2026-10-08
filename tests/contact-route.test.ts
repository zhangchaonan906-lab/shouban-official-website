import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST, runtime } from "../app/api/contact/route";
import { buildContactEmail } from "../lib/contact-email";
import {
  CONTACT_MAIL_NOT_CONFIGURED,
  sendContactEmail
} from "../lib/mail";
import {
  assetTypes,
  contactFieldLimits,
  contactNeedTypes,
  customerTypes,
  type ContactFormValues
} from "../lib/contact";
import {
  CONTACT_MAX_BODY_BYTES,
  parseContactRequest
} from "../lib/contact-request.server";
import { getContactCollectionReadiness } from "../lib/privacy-readiness.server";
import { getReadyPrivacyResult } from "./privacy-fixtures";

vi.mock("@/lib/contact-email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/contact-email")>();

  return {
    ...actual,
    buildContactEmail: vi.fn(actual.buildContactEmail)
  };
});

vi.mock("@/lib/contact-request.server", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../lib/contact-request.server")
  >();

  return {
    ...actual,
    parseContactRequest: vi.fn(actual.parseContactRequest)
  };
});

vi.mock("@/lib/privacy-readiness.server", () => ({
  getContactCollectionReadiness: vi.fn()
}));

vi.mock("@/lib/mail", () => ({
  CONTACT_MAIL_NOT_CONFIGURED: "CONTACT_MAIL_NOT_CONFIGURED",
  sendContactEmail: vi.fn()
}));

const readyPrivacyResult = getReadyPrivacyResult();

if (!readyPrivacyResult.ready) {
  throw new Error("Ready privacy fixture must be ready");
}

const readyPrivacyConfig = readyPrivacyResult.publicConfig;
const currentPolicyMetadata = {
  privacyPolicyVersion: readyPrivacyConfig.policyVersion,
  privacyPolicyEffectiveDate: readyPrivacyConfig.effectiveDate,
  privacyPolicySnapshotId: readyPrivacyConfig.privacyPolicySnapshotId
};
const endpoint = `${readyPrivacyConfig.siteOrigin}/api/contact`;
const validValues: ContactFormValues = {
  name: "王女士",
  phone: "13800138000",
  organization: "某艺人工作室",
  email: "contact@example.com",
  customerType: customerTypes[0],
  needType: contactNeedTypes[0],
  assetType: assetTypes[0],
  platformUrl: "https://example.com/risk-video",
  message: "希望评估人工智能声音克隆与短视频冒用风险。",
  consent: true
};

function request(
  body: unknown = validValues,
  options: {
    contentType?: string;
    origin?: string;
    rawBody?: string;
  } = {}
) {
  const bodyWithPolicyMetadata =
    body !== null
    && typeof body === "object"
    && !Array.isArray(body)
    && !(
      "website" in body
      && typeof body.website === "string"
      && body.website.length > 0
    )
      ? { ...currentPolicyMetadata, ...body }
      : body;

  return new Request(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": options.contentType ?? "application/json",
      Origin: options.origin ?? readyPrivacyConfig.siteOrigin
    },
    body: options.rawBody ?? JSON.stringify(bodyWithPolicyMetadata)
  });
}

function expectPrivateNoStore(response: Response) {
  const cacheControl = response.headers.get("cache-control")?.toLowerCase() ?? "";

  expect(cacheControl).toContain("private");
  expect(cacheControl).toContain("no-store");
  expect(cacheControl).toContain("max-age=0");
}

async function errorBody(response: Response) {
  expectPrivateNoStore(response);
  expect(response.headers.get("content-type")).toContain("application/json");

  const body = await response.json() as {
    ok?: unknown;
    code?: unknown;
    message?: unknown;
    errors?: Record<string, string>;
  };

  expect(body).toMatchObject({
    ok: false,
    code: expect.any(String),
    message: expect.any(String)
  });
  return body;
}

async function successBody(response: Response) {
  expectPrivateNoStore(response);
  expect(response.headers.get("content-type")).toContain("application/json");

  const body = await response.json();
  expect(body).toEqual({
    ok: true,
    message: "提交成功，首版认证工作人员会在后续与您联系并跟进需求。"
  });
  return body;
}

beforeEach(() => {
  vi.mocked(getContactCollectionReadiness).mockReset();
  vi.mocked(getContactCollectionReadiness).mockReturnValue(readyPrivacyResult);
  vi.mocked(parseContactRequest).mockClear();
  vi.mocked(buildContactEmail).mockClear();
  vi.mocked(sendContactEmail).mockReset();
  vi.mocked(sendContactEmail).mockResolvedValue(undefined);
});

describe("POST /api/contact", () => {
  it("declares the Node.js runtime", () => {
    expect(runtime).toBe("nodejs");
  });

  it("returns 503 before accessing the request when privacy readiness is incomplete", async () => {
    vi.mocked(getContactCollectionReadiness).mockReturnValueOnce({
      ready: false,
      issues: [{ code: "PRIVACY_CONFIG_MISSING", key: "PRIVACY_CONTACT_EMAIL" }]
    });
    const unreadableRequest = new Proxy({} as Request, {
      get(_target, property) {
        throw new Error(`request property accessed: ${String(property)}`);
      }
    });

    const response = await POST(unreadableRequest);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      code: "CONTACT_PRIVACY_NOT_READY",
      message: "在线联系功能暂未开放"
    });
    expectPrivateNoStore(response);
    expect(parseContactRequest).not.toHaveBeenCalled();
    expect(buildContactEmail).not.toHaveBeenCalled();
    expect(sendContactEmail).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "media type",
      expectedStatus: 415,
      expectedCode: "CONTACT_UNSUPPORTED_MEDIA_TYPE",
      createRequest: () => request(validValues, { contentType: "text/plain" })
    },
    {
      name: "origin",
      expectedStatus: 403,
      expectedCode: "CONTACT_ORIGIN_FORBIDDEN",
      createRequest: () => request(validValues, { origin: "https://attacker.example" })
    },
    {
      name: "body size",
      expectedStatus: 413,
      expectedCode: "CONTACT_BODY_TOO_LARGE",
      createRequest: () => request(undefined, { rawBody: "x".repeat(CONTACT_MAX_BODY_BYTES + 1) })
    },
    {
      name: "JSON syntax",
      expectedStatus: 400,
      expectedCode: "CONTACT_INVALID_JSON",
      createRequest: () => request(undefined, { rawBody: "{" })
    }
  ])("returns an enveloped error for invalid $name", async ({
    createRequest,
    expectedCode,
    expectedStatus
  }) => {
    const response = await POST(createRequest());
    const body = await errorBody(response);

    expect(response.status).toBe(expectedStatus);
    expect(body.code).toBe(expectedCode);
    expect(buildContactEmail).not.toHaveBeenCalled();
    expect(sendContactEmail).not.toHaveBeenCalled();
  });

  it.each([
    [null],
    [[]],
    ["text"],
    [42],
    [true]
  ] as const)(
    "returns an enveloped error for a non-object JSON body: %j",
    async (bodyValue) => {
      expect(bodyValue).not.toBeUndefined();
      const response = await POST(request(bodyValue));
      const body = await errorBody(response);

      expect(response.status).toBe(400);
      expect(body.code).toBe("CONTACT_INVALID_BODY");
      expect(buildContactEmail).not.toHaveBeenCalled();
      expect(sendContactEmail).not.toHaveBeenCalled();
    }
  );

  const lengthCases = [
    "name",
    "phone",
    "organization",
    "email",
    "customerType",
    "needType",
    "assetType",
    "platformUrl",
    "message"
  ] as const satisfies ReadonlyArray<Exclude<keyof ContactFormValues, "consent">>;

  it.each(lengthCases)(
    "rejects an oversized %s field before the mail adapter",
    async (field) => {
      const response = await POST(request({
        ...validValues,
        [field]: "测".repeat(contactFieldLimits[field] + 1)
      }));
      const body = await errorBody(response);

      expect(response.status).toBe(400);
      expect(body.code).toBe("CONTACT_VALIDATION_FAILED");
      expect(body.errors?.[field]).toEqual(expect.any(String));
      expect(buildContactEmail).not.toHaveBeenCalled();
      expect(sendContactEmail).not.toHaveBeenCalled();
    }
  );

  it("rejects an oversized honeypot before the mail adapter", async () => {
    const response = await POST(request({
      ...validValues,
      website: "x".repeat(contactFieldLimits.website + 1)
    }));
    const body = await errorBody(response);

    expect(response.status).toBe(400);
    expect(body.code).toBe("CONTACT_INVALID_BODY");
    expect(buildContactEmail).not.toHaveBeenCalled();
    expect(sendContactEmail).not.toHaveBeenCalled();
  });

  it("returns field errors through the envelope", async () => {
    const response = await POST(request({ ...validValues, phone: "123" }));
    const body = await errorBody(response);

    expect(response.status).toBe(400);
    expect(body.code).toBe("CONTACT_VALIDATION_FAILED");
    expect(body.errors?.phone).toEqual(expect.any(String));
    expect(buildContactEmail).not.toHaveBeenCalled();
    expect(sendContactEmail).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "missing policy metadata",
      body: { ...validValues, website: "https://spam.example" }
    },
    {
      name: "malformed policy metadata",
      body: {
        ...validValues,
        website: "   ",
        privacyPolicyVersion: { malicious: true },
        privacyPolicyEffectiveDate: ["not", "trusted"],
        privacyPolicySnapshotId: "x".repeat(1_000)
      }
    }
  ])(
    "silently accepts a honeypot with $name before comparing policy metadata",
    async ({ body: requestBody }) => {
      const response = await POST(request(requestBody));
      const body = await successBody(response);

      expect(response.status).toBe(200);
      expect(body).toEqual({
        ok: true,
        message: "提交成功，首版认证工作人员会在后续与您联系并跟进需求。"
      });
      expect(buildContactEmail).not.toHaveBeenCalled();
      expect(sendContactEmail).not.toHaveBeenCalled();
    }
  );

  it.each([
    ["privacyPolicyVersion", "0.9"],
    ["privacyPolicyEffectiveDate", "2026-07-10"],
    ["privacyPolicySnapshotId", "b".repeat(64)]
  ] as const)(
    "rejects a stale %s before building mail",
    async (field, staleValue) => {
      const response = await POST(request({
        ...validValues,
        [field]: staleValue
      }));
      const body = await errorBody(response);

      expect(response.status).toBe(409);
      expect(body).toEqual({
        ok: false,
        code: "CONTACT_POLICY_VERSION_MISMATCH",
        message: "隐私政策已更新，请刷新页面后重新确认"
      });
      expect(buildContactEmail).not.toHaveBeenCalled();
      expect(sendContactEmail).not.toHaveBeenCalled();
    }
  );

  it("rejects a stale snapshot when a public fact changes without a version or date change", async () => {
    const changedPrivacyResult = getReadyPrivacyResult({
      PRIVACY_CONTACT_EMAIL: "privacy-next@shouban.test"
    });

    if (!changedPrivacyResult.ready) {
      throw new Error("Changed privacy fixture must remain ready");
    }

    expect(changedPrivacyResult.publicConfig.policyVersion).toBe(
      readyPrivacyConfig.policyVersion
    );
    expect(changedPrivacyResult.publicConfig.effectiveDate).toBe(
      readyPrivacyConfig.effectiveDate
    );
    expect(changedPrivacyResult.publicConfig.privacyPolicySnapshotId).not.toBe(
      readyPrivacyConfig.privacyPolicySnapshotId
    );
    vi.mocked(getContactCollectionReadiness).mockReturnValueOnce(
      changedPrivacyResult
    );

    const response = await POST(request());
    const body = await errorBody(response);

    expect(response.status).toBe(409);
    expect(body).toEqual({
      ok: false,
      code: "CONTACT_POLICY_VERSION_MISMATCH",
      message: "隐私政策已更新，请刷新页面后重新确认"
    });
    expect(buildContactEmail).not.toHaveBeenCalled();
    expect(sendContactEmail).not.toHaveBeenCalled();
  });

  it("builds accepted mail once from current server facts and uses the existing adapter", async () => {
    const submission = request(validValues, {
      contentType: "application/json; charset=utf-8"
    });

    const response = await POST(submission);
    const body = await successBody(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      message: "提交成功，首版认证工作人员会在后续与您联系并跟进需求。"
    });
    expect(parseContactRequest).toHaveBeenCalledTimes(1);
    expect(parseContactRequest).toHaveBeenCalledWith(
      submission,
      readyPrivacyConfig.siteOrigin
    );
    expect(buildContactEmail).toHaveBeenCalledTimes(1);
    const [builtValues, context] = vi.mocked(buildContactEmail).mock.calls[0];
    expect(builtValues).toEqual(validValues);
    expect(context).toEqual({
      requestId: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ),
      receivedAt: expect.any(String),
      privacyPolicyVersion: readyPrivacyConfig.policyVersion,
      privacyPolicyEffectiveDate: readyPrivacyConfig.effectiveDate,
      privacyPolicySnapshotId: readyPrivacyConfig.privacyPolicySnapshotId
    });
    expect(new Date(context.receivedAt).toISOString()).toBe(context.receivedAt);
    expect(sendContactEmail).toHaveBeenCalledTimes(1);
    expect(sendContactEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.any(String),
        text: expect.stringContaining(context.requestId)
      })
    );
  });

  it("returns an enveloped 503 when SMTP is not configured", async () => {
    vi.mocked(sendContactEmail).mockRejectedValueOnce(
      new Error(CONTACT_MAIL_NOT_CONFIGURED)
    );

    const response = await POST(request());
    const body = await errorBody(response);

    expect(response.status).toBe(503);
    expect(body.code).toBe("CONTACT_MAIL_NOT_CONFIGURED");
  });

  it("returns an enveloped 502 for other mail adapter failures", async () => {
    vi.mocked(sendContactEmail).mockRejectedValueOnce(new Error("smtp failed"));

    const response = await POST(request());
    const body = await errorBody(response);

    expect(response.status).toBe(502);
    expect(body.code).toBe("CONTACT_MAIL_FAILED");
  });
});
