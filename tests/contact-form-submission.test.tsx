// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContactForm } from "../components/forms/ContactForm";
import {
  assetTypes,
  contactFieldLimits,
  contactNeedTypes,
  customerTypes
} from "../lib/contact";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("")
}));

const fetchMock = vi.fn();

const contactFormPolicyProps = {
  privacyPolicyVersion: "1.0",
  privacyPolicyEffectiveDate: "2026-07-11",
  privacyPolicySnapshotId: "a".repeat(64)
};

function renderContactForm() {
  return render(<ContactForm {...contactFormPolicyProps} />);
}

function response({
  status,
  contentType,
  body
}: {
  status: number;
  contentType: string;
  body: unknown;
}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => name.toLowerCase() === "content-type" ? contentType : null
    },
    json: async () => {
      if (!contentType.includes("application/json")) {
        throw new SyntaxError("not JSON");
      }

      return body;
    }
  } as Response;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

function completeForm() {
  fireEvent.change(screen.getByLabelText("姓名"), {
    target: { value: "王女士" }
  });
  fireEvent.change(screen.getByLabelText("手机号"), {
    target: { value: "13800138000" }
  });
  fireEvent.change(screen.getByLabelText("机构/工作室"), {
    target: { value: "某艺人工作室" }
  });
  fireEvent.change(screen.getByLabelText("邮箱"), {
    target: { value: "contact@example.com" }
  });
  fireEvent.change(screen.getByLabelText("客户类型"), {
    target: { value: customerTypes[0] }
  });
  fireEvent.change(screen.getByLabelText("需求类型"), {
    target: { value: contactNeedTypes[0] }
  });
  fireEvent.change(screen.getByLabelText("资产类型"), {
    target: { value: assetTypes[0] }
  });
  fireEvent.change(screen.getByLabelText("平台或链接"), {
    target: { value: "https://example.com/risk-video" }
  });
  fireEvent.change(screen.getByLabelText("需求描述"), {
    target: { value: "希望评估人工智能声音克隆与短视频冒用风险。" }
  });
  fireEvent.click(screen.getByRole("checkbox"));
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "提交需求" }));
}

function expectEnteredValuesAndEnabledSubmit({ consent = true }: { consent?: boolean } = {}) {
  expect((screen.getByLabelText("姓名") as HTMLInputElement).value).toBe("王女士");
  expect((screen.getByLabelText("手机号") as HTMLInputElement).value).toBe("13800138000");
  expect((screen.getByLabelText("机构/工作室") as HTMLInputElement).value).toBe("某艺人工作室");
  expect((screen.getByLabelText("邮箱") as HTMLInputElement).value).toBe("contact@example.com");
  expect((screen.getByLabelText("客户类型") as HTMLSelectElement).value).toBe(customerTypes[0]);
  expect((screen.getByLabelText("需求类型") as HTMLSelectElement).value).toBe(contactNeedTypes[0]);
  expect((screen.getByLabelText("资产类型") as HTMLSelectElement).value).toBe(assetTypes[0]);
  expect((screen.getByLabelText("平台或链接") as HTMLInputElement).value).toBe("https://example.com/risk-video");
  expect((screen.getByLabelText("需求描述") as HTMLTextAreaElement).value).toBe(
    "希望评估人工智能声音克隆与短视频冒用风险。"
  );
  expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(consent);
  expect((screen.getByRole("button", { name: "提交需求" }) as HTMLButtonElement).disabled).toBe(false);
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: true })
  });
  Object.defineProperty(window, "scrollTo", {
    configurable: true,
    value: vi.fn()
  });
  Object.defineProperty(window, "requestAnimationFrame", {
    configurable: true,
    writable: true,
    value: vi.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    })
  });
  Object.defineProperty(window, "cancelAnimationFrame", {
    configurable: true,
    writable: true,
    value: vi.fn()
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("contact form secure submission", () => {
  it("renders a non-focusable honeypot and browser-level maximum lengths", () => {
    const { container } = renderContactForm();
    const honeypot = container.querySelector<HTMLInputElement>('input[name="website"]');

    expect(honeypot).not.toBeNull();
    expect(honeypot?.getAttribute("aria-hidden")).toBe("true");
    expect(honeypot?.tabIndex).toBe(-1);
    expect(honeypot?.maxLength).toBe(contactFieldLimits.website);
    expect(honeypot?.autocomplete).toBe("off");

    const limits = [
      ["姓名", contactFieldLimits.name],
      ["手机号", contactFieldLimits.phone],
      ["机构/工作室", contactFieldLimits.organization],
      ["邮箱", contactFieldLimits.email],
      ["平台或链接", contactFieldLimits.platformUrl],
      ["需求描述", contactFieldLimits.message]
    ] as const;

    for (const [label, limit] of limits) {
      expect((screen.getByLabelText(label) as HTMLInputElement).maxLength).toBe(limit);
    }
  });

  it.each([
    ["empty by default", ""],
    ["when filled", "https://spam.example"]
  ])("includes the honeypot value in the JSON submission %s", async (_case, website) => {
    fetchMock.mockResolvedValueOnce(response({
      status: 200,
      contentType: "application/json",
      body: { ok: true, message: "accepted" }
    }));
    const { container } = renderContactForm();
    completeForm();
    const honeypot = container.querySelector<HTMLInputElement>('input[name="website"]');
    expect(honeypot).not.toBeNull();
    if (website) {
      fireEvent.change(honeypot!, { target: { value: website } });
    }

    submit();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(init.body as string)).toMatchObject({
      name: "王女士",
      website,
      ...contactFormPolicyProps
    });
  });

  it("ignores an older success after the user changes the pending draft", async () => {
    const pending = deferred<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    renderContactForm();
    completeForm();

    submit();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText("姓名"), { target: { value: "李女士" } });
    const platformUrl = screen.getByLabelText("平台或链接");
    const message = screen.getByLabelText("需求描述");
    act(() => platformUrl.focus());
    fireEvent.change(platformUrl, { target: { value: "ftp://example.com/private" } });
    act(() => message.focus());
    expect(screen.getByText("请填写有效的 http 或 https 链接")).toBeTruthy();

    pending.resolve(response({
      status: 200,
      contentType: "application/json",
      body: { ok: true, message: "accepted" }
    }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "提交需求" })).toBeTruthy();
    });
    expect(screen.queryByText("提交成功，首版认证工作人员会在后续与您联系并跟进需求。")).toBeNull();
    expect(document.querySelector(".contact-form-message")).toBeNull();
    expect((screen.getByLabelText("姓名") as HTMLInputElement).value).toBe("李女士");
    expect(screen.getByText("请填写有效的 http 或 https 链接")).toBeTruthy();
    expect(document.activeElement).toBe(message);
  });

  it("ignores stale pending global and field errors after the user changes the phone", async () => {
    const pending = deferred<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    renderContactForm();
    completeForm();

    submit();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText("手机号"), { target: { value: "13900139000" } });
    const email = screen.getByLabelText("邮箱");
    act(() => email.focus());

    pending.resolve(response({
      status: 400,
      contentType: "application/json",
      body: {
        ok: false,
        code: "CONTACT_VALIDATION_FAILED",
        message: "旧请求校验失败",
        errors: { phone: "旧请求手机号错误" }
      }
    }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "提交需求" })).toBeTruthy();
    });
    expect(screen.queryByText("旧请求校验失败")).toBeNull();
    expect(screen.queryByText("旧请求手机号错误")).toBeNull();
    expect(document.querySelector(".contact-form-message")).toBeNull();
    expect((screen.getByLabelText("手机号") as HTMLInputElement).value).toBe("13900139000");
    expect(screen.getByLabelText("手机号").getAttribute("aria-invalid")).toBeNull();
    expect(document.activeElement).toBe(email);
  });

  it("exposes a perceivable busy state while a submission is pending", async () => {
    const pending = deferred<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    renderContactForm();
    completeForm();

    submit();

    const button = screen.getByRole("button", { name: "正在提交…" });
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.querySelector("svg")?.getAttribute("class")).toContain("motion-safe:animate-spin");

    pending.resolve(response({
      status: 200,
      contentType: "application/json",
      body: { ok: true, message: "accepted" }
    }));
    expect(await screen.findByText("提交成功，首版认证工作人员会在后续与您联系并跟进需求。")).toBeTruthy();
  });

  it("handles a non-JSON 429 response and preserves entered values", async () => {
    fetchMock.mockResolvedValueOnce(response({
      status: 429,
      contentType: "text/html",
      body: "<html>blocked</html>"
    }));
    renderContactForm();
    completeForm();

    submit();

    expect(await screen.findByText("提交过于频繁，请稍后再试。")).toBeTruthy();
    expectEnteredValuesAndEnabledSubmit();
  });

  it("handles other non-JSON error responses and preserves entered values", async () => {
    fetchMock.mockResolvedValueOnce(response({
      status: 502,
      contentType: "text/html",
      body: "<html>bad gateway</html>"
    }));
    renderContactForm();
    completeForm();

    submit();

    expect(await screen.findByText("提交失败，请稍后再试。")).toBeTruthy();
    expectEnteredValuesAndEnabledSubmit();
  });

  it("falls back to a generic message when a JSON error message is blank", async () => {
    fetchMock.mockResolvedValueOnce(response({
      status: 502,
      contentType: "application/json",
      body: {
        ok: false,
        code: "CONTACT_MAIL_FAILED",
        message: "   "
      }
    }));
    renderContactForm();
    completeForm();

    submit();

    expect(await screen.findByText("提交失败，请稍后再试。")).toBeTruthy();
    expectEnteredValuesAndEnabledSubmit();
  });

  it("uses a valid JSON envelope message and field errors", async () => {
    fetchMock.mockResolvedValueOnce(response({
      status: 400,
      contentType: "application/json; charset=utf-8",
      body: {
        ok: false,
        code: "CONTACT_VALIDATION_FAILED",
        message: "请检查并完善表单内容",
        errors: { phone: "手机号需要重新检查" }
      }
    }));
    renderContactForm();
    completeForm();

    submit();

    expect(await screen.findByText("请检查并完善表单内容")).toBeTruthy();
    expect(screen.getByText("手机号需要重新检查")).toBeTruthy();
    expect(document.activeElement?.id).toBe("phone");
    expectEnteredValuesAndEnabledSubmit();
  });

  it("accepts the contactMethod server error, counts it once, and focuses phone", async () => {
    fetchMock.mockResolvedValueOnce(response({
      status: 400,
      contentType: "application/json",
      body: {
        ok: false,
        code: "CONTACT_VALIDATION_FAILED",
        message: "请检查并完善表单内容",
        errors: { contactMethod: "请至少填写手机号或邮箱中的一项" }
      }
    }));
    renderContactForm();
    completeForm();

    submit();

    expect(await screen.findByText("请至少填写手机号或邮箱中的一项")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("1 项内容需要完善");
    expect(document.activeElement?.id).toBe("phone");
    expectEnteredValuesAndEnabledSubmit();
  });

  it("keeps policy mismatch safety-priority and only succeeds with refreshed policy tokens", async () => {
    const serverMessage = "隐私政策已更新，请刷新页面后重新确认";
    const firstMismatch = deferred<Response>();
    const updatedPolicyProps = {
      privacyPolicyVersion: "1.1",
      privacyPolicyEffectiveDate: "2026-07-12",
      privacyPolicySnapshotId: "b".repeat(64)
    };
    fetchMock
      .mockReturnValueOnce(firstMismatch.promise)
      .mockResolvedValueOnce(response({
        status: 409,
        contentType: "application/json",
        body: {
          ok: false,
          code: "CONTACT_POLICY_VERSION_MISMATCH",
          message: serverMessage
        }
      }))
      .mockResolvedValueOnce(response({
        status: 200,
        contentType: "application/json",
        body: { ok: true, message: "accepted" }
      }));
    const { rerender } = renderContactForm();
    completeForm();

    submit();
    fireEvent.change(screen.getByLabelText("姓名"), { target: { value: "李女士" } });
    firstMismatch.resolve(response({
      status: 409,
      contentType: "application/json",
      body: {
        ok: false,
        code: "CONTACT_POLICY_VERSION_MISMATCH",
        message: serverMessage
      }
    }));

    expect(await screen.findByText(serverMessage)).toBeTruthy();
    expect((screen.getByLabelText("姓名") as HTMLInputElement).value).toBe("李女士");
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
    expect(document.activeElement?.id).toBe("privacy-policy-link");

    fireEvent.click(screen.getByRole("checkbox"));
    submit();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() => {
      expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
    });
    expect(document.activeElement?.id).toBe("privacy-policy-link");

    const staleRetryInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(JSON.parse(staleRetryInit.body as string)).toMatchObject(contactFormPolicyProps);

    rerender(<ContactForm {...updatedPolicyProps} />);
    fireEvent.click(screen.getByRole("checkbox"));
    submit();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(await screen.findByText("提交成功，首版认证工作人员会在后续与您联系并跟进需求。")).toBeTruthy();

    const refreshedRetryInit = fetchMock.mock.calls[2]?.[1] as RequestInit;
    expect(JSON.parse(refreshedRetryInit.body as string)).toMatchObject(updatedPolicyProps);
  });

  it("ignores a stale pending network failure after the user changes the draft", async () => {
    const pending = deferred<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    renderContactForm();
    completeForm();

    submit();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const platformUrl = screen.getByLabelText("平台或链接");
    const message = screen.getByLabelText("需求描述");
    act(() => platformUrl.focus());
    fireEvent.change(platformUrl, { target: { value: "ftp://example.com/private" } });
    act(() => message.focus());
    expect(screen.getByText("请填写有效的 http 或 https 链接")).toBeTruthy();

    pending.reject(new TypeError("Failed to fetch"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "提交需求" })).toBeTruthy();
    });
    expect(screen.queryByText("网络连接异常，请检查网络后重试。")).toBeNull();
    expect(document.querySelector(".contact-form-message")).toBeNull();
    expect(screen.getByText("请填写有效的 http 或 https 链接")).toBeTruthy();
    expect((platformUrl as HTMLInputElement).value).toBe("ftp://example.com/private");
    expect(document.activeElement).toBe(message);
  });

  it("handles network failures and preserves entered values", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    renderContactForm();
    completeForm();

    submit();

    expect(await screen.findByText("网络连接异常，请检查网络后重试。")).toBeTruthy();
    expectEnteredValuesAndEnabledSubmit();
  });

  it("aborts a pending request after ten seconds and preserves entered values", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementationOnce((_input: RequestInfo | URL, init?: RequestInit) => (
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
        }, { once: true });
      })
    ));
    renderContactForm();
    completeForm();

    submit();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByText("提交超时，请稍后重试。")).toBeTruthy();
    expectEnteredValuesAndEnabledSubmit();
  });

  it("reports a timeout when reading an error response body is aborted", async () => {
    vi.useFakeTimers();
    const jsonMock = vi.fn();

    fetchMock.mockImplementationOnce((_input: RequestInfo | URL, init?: RequestInit) => (
      Promise.resolve({
        ok: false,
        status: 502,
        headers: {
          get: (name: string) => name.toLowerCase() === "content-type"
            ? "application/json"
            : null
        },
        json: () => {
          jsonMock();
          return new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
            }, { once: true });
          });
        }
      } as Response)
    ));
    renderContactForm();
    completeForm();

    submit();
    await act(async () => {
      await Promise.resolve();
    });
    expect(jsonMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByText("提交超时，请稍后重试。")).toBeTruthy();
    expectEnteredValuesAndEnabledSubmit();
  });
});
