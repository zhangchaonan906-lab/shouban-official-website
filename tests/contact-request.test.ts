import { describe, expect, it } from "vitest";
import {
  assetTypes,
  contactFieldLimits,
  contactNeedTypes,
  customerTypes,
  type ContactFormValues,
  type ContactPolicySubmissionMetadata
} from "../lib/contact";
import {
  CONTACT_MAX_BODY_BYTES,
  parseContactRequest
} from "../lib/contact-request.server";

const endpoint = "https://www.shoubanrenzheng.com/api/contact";
const allowedOrigin = new URL(endpoint).origin;
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
const validPolicyMetadata: ContactPolicySubmissionMetadata = {
  privacyPolicyVersion: "1.0",
  privacyPolicyEffectiveDate: "2026-07-11",
  privacyPolicySnapshotId: "a".repeat(64)
};
const validBody = {
  ...validValues,
  ...validPolicyMetadata
};

type RequestOptions = {
  contentType?: string;
  origin?: string | null;
  rawBody?: string;
  url?: string;
};

function contactRequest(
  body: unknown = validBody,
  {
    contentType = "application/json",
    origin = allowedOrigin,
    rawBody,
    url = endpoint
  }: RequestOptions = {}
) {
  const headers = new Headers({ "Content-Type": contentType });

  if (origin !== null) {
    headers.set("Origin", origin);
  }

  return new Request(url, {
    method: "POST",
    headers,
    body: rawBody ?? JSON.stringify(body)
  });
}

function expectFailure(
  result: Awaited<ReturnType<typeof parseContactRequest>>,
  status: number,
  code: string
) {
  expect(result).toMatchObject({
    ok: false,
    status,
    body: {
      ok: false,
      code,
      message: expect.any(String)
    }
  });
}

describe("contact request security boundary", () => {
  it("rejects non-JSON media types", async () => {
    const result = await parseContactRequest(
      contactRequest(validBody, { contentType: "text/plain" }),
      allowedOrigin
    );

    expectFailure(result, 415, "CONTACT_UNSUPPORTED_MEDIA_TYPE");
  });

  it.each([null, "https://attacker.example", `${allowedOrigin}/unexpected-path`])(
    "rejects a request origin that does not exactly match the allowed origin: %s",
    async (origin) => {
      const result = await parseContactRequest(
        contactRequest(validBody, { origin }),
        allowedOrigin
      );

      expectFailure(result, 403, "CONTACT_ORIGIN_FORBIDDEN");
    }
  );

  it("accepts the exact allowed origin independently of the request URL", async () => {
    const result = await parseContactRequest(
      contactRequest(validBody, {
        origin: allowedOrigin,
        url: "https://internal-preview.example/api/contact"
      }),
      allowedOrigin
    );

    expect(result).toMatchObject({ ok: true, honeypot: false });
  });

  it.each([
    `${allowedOrigin}/path`,
    `${allowedOrigin}?preview=true`,
    "https://user@example.com",
    "not-an-origin"
  ])("fails closed when the configured allowed origin is not an origin: %s", async (invalidOrigin) => {
    const result = await parseContactRequest(contactRequest(), invalidOrigin);

    expectFailure(result, 403, "CONTACT_ORIGIN_FORBIDDEN");
  });

  it("rejects request streams beyond the byte limit", async () => {
    const result = await parseContactRequest(
      contactRequest(undefined, { rawBody: "x".repeat(CONTACT_MAX_BODY_BYTES + 1) }),
      allowedOrigin
    );

    expectFailure(result, 413, "CONTACT_BODY_TOO_LARGE");
  });

  it("rejects malformed JSON", async () => {
    const result = await parseContactRequest(
      contactRequest(undefined, { rawBody: "{" }),
      allowedOrigin
    );

    expectFailure(result, 400, "CONTACT_INVALID_JSON");
  });

  it.each([
    [null],
    [[]],
    ["text"],
    [42],
    [true]
  ] as const)(
    "rejects non-object JSON bodies: %j",
    async (body) => {
      expect(body).not.toBeUndefined();
      const result = await parseContactRequest(contactRequest(body), allowedOrigin);

      expectFailure(result, 400, "CONTACT_INVALID_BODY");
    }
  );

  it("accepts JSON media types with a charset and extracts policy metadata", async () => {
    const result = await parseContactRequest(
      contactRequest(validBody, { contentType: "application/json; charset=utf-8" }),
      allowedOrigin
    );

    expect(result).toEqual({
      ok: true,
      honeypot: false,
      values: validValues,
      policyMetadata: validPolicyMetadata
    });
  });

  it("extracts missing policy metadata as empty strings for human submissions", async () => {
    const result = await parseContactRequest(
      contactRequest(validValues),
      allowedOrigin
    );

    expect(result).toEqual({
      ok: true,
      honeypot: false,
      values: validValues,
      policyMetadata: {
        privacyPolicyVersion: "",
        privacyPolicyEffectiveDate: "",
        privacyPolicySnapshotId: ""
      }
    });
  });

  it("bounds policy metadata without treating client values as truth", async () => {
    const untrustedPolicyMetadata: ContactPolicySubmissionMetadata = {
      privacyPolicyVersion: "draft-client-label",
      privacyPolicyEffectiveDate: "not-a-date",
      privacyPolicySnapshotId: "not-a-trusted-snapshot"
    };
    const result = await parseContactRequest(
      contactRequest({
        ...validValues,
        ...untrustedPolicyMetadata
      }),
      allowedOrigin
    );

    expect(result).toEqual({
      ok: true,
      honeypot: false,
      values: validValues,
      policyMetadata: untrustedPolicyMetadata
    });
  });

  const policyFields = [
    ["privacyPolicyVersion", 32],
    ["privacyPolicyEffectiveDate", 10],
    ["privacyPolicySnapshotId", 64]
  ] as const satisfies ReadonlyArray<
    readonly [
      keyof ContactPolicySubmissionMetadata,
      number
    ]
  >;

  it.each(policyFields)(
    "rejects a non-string %s",
    async (field) => {
      const result = await parseContactRequest(
        contactRequest({
          ...validBody,
          [field]: { untrusted: true }
        }),
        allowedOrigin
      );

      expectFailure(result, 400, "CONTACT_INVALID_BODY");
    }
  );

  it.each(policyFields)(
    "rejects %s beyond its configured maximum",
    async (field, limit) => {
      const result = await parseContactRequest(
        contactRequest({
          ...validBody,
          [field]: "x".repeat(limit + 1)
        }),
        allowedOrigin
      );

      expectFailure(result, 400, "CONTACT_INVALID_BODY");
    }
  );

  it.each([
    {
      name: "missing policy fields",
      policyFields: {}
    },
    {
      name: "a non-string policy field",
      policyFields: { privacyPolicyVersion: { untrusted: true } }
    },
    {
      name: "an oversized policy field",
      policyFields: {
        privacyPolicySnapshotId: "x".repeat(65)
      }
    }
  ])("short-circuits a filled honeypot before reading $name", async ({ policyFields }) => {
    const result = await parseContactRequest(
      contactRequest({
        ...validValues,
        ...policyFields,
        website: "https://spam.example"
      }),
      allowedOrigin
    );

    expect(result).toMatchObject({ ok: true, honeypot: true });
    expect(result).not.toHaveProperty("policyMetadata");
  });

  it("rejects a non-string honeypot before policy metadata", async () => {
    const result = await parseContactRequest(
      contactRequest({
        ...validBody,
        website: { filled: true },
        privacyPolicyVersion: { untrusted: true }
      }),
      allowedOrigin
    );

    expectFailure(result, 400, "CONTACT_INVALID_BODY");
  });

  it("rejects a honeypot value beyond its server-side maximum", async () => {
    const result = await parseContactRequest(
      contactRequest({
        ...validBody,
        website: "x".repeat(contactFieldLimits.website + 1)
      }),
      allowedOrigin
    );

    expectFailure(result, 400, "CONTACT_INVALID_BODY");
  });

  it("returns validation errors in the stable JSON envelope", async () => {
    const result = await parseContactRequest(
      contactRequest({ ...validBody, phone: "123" }),
      allowedOrigin
    );

    expectFailure(result, 400, "CONTACT_VALIDATION_FAILED");
    if (!result.ok) {
      expect(result.body.errors?.phone).toEqual(expect.any(String));
    }
  });
});
