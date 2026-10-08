import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getReadyPrivacyResult } from "./privacy-fixtures";

const getContactCollectionReadinessMock = vi.hoisted(
  () => vi.fn<() => unknown>()
);
const contactFormMock = vi.hoisted(
  () => vi.fn<(props: Record<string, string>) => void>()
);

vi.mock("@/lib/privacy-readiness.server", () => ({
  getContactCollectionReadiness: getContactCollectionReadinessMock
}));

vi.mock("@/components/forms/ContactForm", () => ({
  ContactForm: (props: Record<string, string>) => {
    contactFormMock(props);

    return (
      <form
        data-policy-effective-date={props.privacyPolicyEffectiveDate}
        data-policy-snapshot-id={props.privacyPolicySnapshotId}
        data-policy-version={props.privacyPolicyVersion}
      >
        <input name="mock-contact-field" />
      </form>
    );
  }
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className
  }: {
    children: ReactNode;
    href: string;
    className?: string;
  }) => (
    <a className={className} href={href}>
      {children}
    </a>
  )
}));

import * as ContactPageModule from "../app/contact/page";

const contactPageSource = readFileSync(
  new URL("../app/contact/page.tsx", import.meta.url),
  "utf8"
);
const readyPrivacyResult = getReadyPrivacyResult();

if (!readyPrivacyResult.ready) {
  throw new Error("Ready privacy fixture must be ready");
}

beforeEach(() => {
  getContactCollectionReadinessMock.mockReset();
  contactFormMock.mockClear();
});

describe("contact page readiness gate", () => {
  it("uses the interior Fluent frame without changing readiness exports", () => {
    expect(contactPageSource).toContain("InteriorPageFrame");
    expect(contactPageSource).toContain('data-fluent-surface="elevated"');
  });

  it("renders only a public preparation notice when collection is not ready", () => {
    getContactCollectionReadinessMock.mockReturnValue({
      ready: false,
      issues: [
        {
          code: "SENTINEL_PRIVATE_ISSUE",
          key: "SMTP_PASS"
        }
      ]
    });

    const markup = renderToStaticMarkup(<ContactPageModule.default />);

    expect(getContactCollectionReadinessMock).toHaveBeenCalledTimes(1);
    expect(markup.match(/<h1\b/g) ?? []).toHaveLength(1);
    expect(markup).toMatch(/<h1[^>]*>联系功能准备中<\/h1>/);
    expect(markup).toContain("隐私政策与邮件服务准备完成后开放");
    expect(markup).toMatch(/<a[^>]*href="\/privacy"[^>]*>[^<]*隐私政策草案[^<]*<\/a>/);
    expect(markup).toMatch(/<a[^>]*class="[^"]*\bmin-h-11\b[^"]*"[^>]*href="\/privacy"/);

    for (const element of ["form", "input", "textarea", "select", "button"]) {
      expect(markup).not.toMatch(new RegExp(`<${element}\\b`, "i"));
    }
    expect(markup).not.toMatch(/type="(?:checkbox|submit)"/i);
    expect(contactFormMock).not.toHaveBeenCalled();
    expect(markup).not.toContain("SENTINEL_PRIVATE_ISSUE");
    expect(markup).not.toContain("SMTP_PASS");
  });

  it("passes only public policy metadata to the form when collection is ready", () => {
    getContactCollectionReadinessMock.mockReturnValue(readyPrivacyResult);

    const markup = renderToStaticMarkup(<ContactPageModule.default />);
    const expectedProps = {
      privacyPolicyVersion: readyPrivacyResult.publicConfig.policyVersion,
      privacyPolicyEffectiveDate: readyPrivacyResult.publicConfig.effectiveDate,
      privacyPolicySnapshotId:
        readyPrivacyResult.publicConfig.privacyPolicySnapshotId
    };

    expect(getContactCollectionReadinessMock).toHaveBeenCalledTimes(1);
    expect(contactFormMock).toHaveBeenCalledTimes(1);
    expect(contactFormMock.mock.calls[0]?.[0]).toEqual(expectedProps);
    expect(Object.keys(contactFormMock.mock.calls[0]?.[0] ?? {}).sort()).toEqual(
      Object.keys(expectedProps).sort()
    );
    expect(markup).toContain("<form");
  });

  it("forces dynamic rendering without empty policy token fallbacks", () => {
    expect(ContactPageModule.dynamic).toBe("force-dynamic");
    expect(ContactPageModule.revalidate).toBe(0);
    expect(contactPageSource).toContain(
      'export const dynamic = "force-dynamic";'
    );
    expect(contactPageSource).toContain("export const revalidate = 0;");

    for (const prop of [
      "privacyPolicyVersion",
      "privacyPolicyEffectiveDate",
      "privacyPolicySnapshotId"
    ]) {
      expect(contactPageSource).not.toContain(`${prop}=""`);
    }
    expect(contactPageSource).not.toContain("Temporary fail-closed transition");
  });
});
