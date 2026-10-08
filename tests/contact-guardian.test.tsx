// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContactForm } from "../components/forms/ContactForm";
import { assetTypes, contactNeedTypes, customerTypes } from "../lib/contact";
import {
  CHILD_CONTACT_NOTICE,
  SENSITIVE_MATERIAL_WARNING
} from "../lib/privacy-policy.mjs";
import {
  getFieldCharacterState,
  resolveCharacterState
} from "../hooks/use-character-interaction";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("")
}));

const contactFormPolicyProps = {
  privacyPolicyVersion: "1.0",
  privacyPolicyEffectiveDate: "2026-07-11",
  privacyPolicySnapshotId: "a".repeat(64)
};

function renderContactForm() {
  return render(<ContactForm {...contactFormPolicyProps} />);
}

function renderContactFormToStaticMarkup() {
  return renderToStaticMarkup(<ContactForm {...contactFormPolicyProps} />);
}

beforeEach(() => {
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
    value: vi.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    })
  });
  Object.defineProperty(window, "cancelAnimationFrame", {
    configurable: true,
    value: vi.fn()
  });
});

afterEach(() => cleanup());

function completeBasicFields() {
  fireEvent.change(screen.getByLabelText("姓名"), { target: { value: "张三" } });
  fireEvent.change(screen.getByLabelText("手机号"), { target: { value: "13800138000" } });
  fireEvent.change(screen.getByLabelText("机构/工作室"), { target: { value: "首版工作室" } });
  fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "demo@example.com" } });
  fireEvent.change(screen.getByLabelText("客户类型"), { target: { value: "品牌/经纪公司" } });
}

function completeRequiredFields({ phone = "13800138000", email = "" } = {}) {
  fireEvent.change(screen.getByLabelText("姓名"), { target: { value: "张三" } });
  fireEvent.change(screen.getByLabelText("手机号"), { target: { value: phone } });
  fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("客户类型"), { target: { value: customerTypes[0] } });
  fireEvent.change(screen.getByLabelText("需求类型"), { target: { value: contactNeedTypes[0] } });
  fireEvent.change(screen.getByLabelText("资产类型"), { target: { value: assetTypes[0] } });
  fireEvent.change(screen.getByLabelText("需求描述"), {
    target: { value: "这是用于验证联系方式分组的完整需求描述。" }
  });
  fireEvent.click(screen.getByRole("checkbox"));
}

describe("contact interactive experience", () => {
  it("renders exactly one primary heading for the ready contact form", () => {
    renderContactForm();

    const primaryHeadings = screen.queryAllByRole("heading", { level: 1 });
    expect(primaryHeadings).toHaveLength(1);
    expect(primaryHeadings[0]?.textContent).toBe("提交服务需求");
  });

  it("restores the original single-page form while keeping source-faithful characters and the form API", () => {
    const markup = renderContactFormToStaticMarkup();

    expect(markup).toContain("contact-interactive-shell");
    expect(markup).toContain("contact-character-stage");
    expect(markup).toContain("contact-form-panel__inner");
    expect(markup).toContain("contact-form-panel__heading");
    expect(markup).toContain("contact-form-panel__fields");
    expect(markup).toContain("contact-form-submit");
    expect(markup).not.toContain("data-contact-step");
    expect(markup).not.toContain("data-step-target");
    expect(markup).not.toContain("下一步：服务需求");
    expect(markup).not.toContain("返回基础信息");
    for (const name of [
      "name",
      "phone",
      "organization",
      "email",
      "customerType",
      "needType",
      "assetType",
      "platformUrl",
      "message",
      "consent"
    ]) {
      expect(markup).toContain(`name="${name}"`);
    }
    expect(markup).toContain('id="contact-character-purple"');
    expect(markup).toContain('id="contact-character-black"');
    expect(markup).toContain('id="contact-character-orange"');
    expect(markup).toContain('id="contact-character-yellow"');
    expect(markup).toContain("contact-character-body--purple");
    expect(markup).toContain("contact-character-body--orange");
    expect(markup).not.toContain('<svg class="contact-characters"');
    expect(markup).toContain("提交服务需求");
    expect(markup).toContain('data-state="idle"');

    const source = readFileSync(join(process.cwd(), "components", "forms", "ContactForm.tsx"), "utf8");
    expect(source).toContain('fetch("/api/contact"');
  });

  it("uses the unified character states while preserving the form geometry", () => {
    const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
    const hookSource = readFileSync(join(process.cwd(), "hooks", "use-character-interaction.ts"), "utf8");
    const eyeSource = readFileSync(join(process.cwd(), "components", "contact", "character-eye.tsx"), "utf8");
    const contactCss = css.slice(css.indexOf("/* Contact experience v2 */"));

    expect(contactCss).not.toBe("");
    expect(css).not.toContain(".contact-geometric-experience");
    expect(css).not.toContain(".contact-form-scroll");
    expect(css).toMatch(/\.contact-page-stage\s*\{[^}]*overflow:\s*visible/s);
    expect(css).toMatch(/\.contact-interactive-shell\s*\{[^}]*height:\s*auto/s);
    expect(css).toContain(".contact-character-stage");
    expect(css).toContain('.contact-characters[data-scene="name"][data-phase="act"]');
    expect(css).toContain('.contact-character[data-cue="close-eyes"]');
    expect(css).toContain('.contact-character[data-cue="question"]');
    expect(css).toContain('.contact-characters[data-scene="success"][data-phase="act"]');
    expect(css).toMatch(/\.contact-characters\[data-scene="listening"\] \.contact-character-face\s*\{[^}]*--face-look-y:\s*0px/s);
    expect(css).toContain(".contact-form-panel__inner");
    expect(css).toContain(".contact-form-panel__heading");
    expect(css).toContain(".contact-form-panel__fields");
    expect(css).not.toContain(".contact-form-viewport");
    expect(css).not.toContain(".contact-form-progress");
    expect(css).toMatch(/\.contact-form-control\s*\{[^}]*height:\s*36px/s);
    expect(css).toMatch(/\.contact-form-control\s*\{[^}]*border-bottom:\s*1px solid #a1a1aa/s);
    expect(css).toMatch(/\.contact-form-control\s*\{[^}]*border-radius:\s*0/s);
    expect(css).toMatch(/\.contact-form-control\s*\{[^}]*background:\s*transparent/s);
    expect(css).toMatch(/\.contact-page-stage\s*\{[^}]*border-bottom:\s*1px solid rgba\(51, 71, 184, 0\.14\)/s);
    expect(css).toMatch(/\.contact-characters\s*\{[^}]*clip-path:\s*inset\([^;]*0[^;]*\)/s);
    expect(css).toMatch(/\.contact-character-ground\s*\{[^}]*z-index:\s*10/s);
    expect(css).not.toContain('.contact-interactive-shell[data-state="error"]');
    expect(css).toMatch(/\.contact-form-field\s*\{[^}]*position:\s*relative/s);
    expect(css).not.toMatch(/\.contact-form-field__error\s*\{[^}]*position:\s*absolute/s);
    expect(css).not.toMatch(/\.contact-form-options__error\s*\{[^}]*position:\s*absolute/s);
    expect(css).not.toMatch(/\.contact-method-group__error\s*\{[^}]*position:\s*absolute/s);
    expect(css).toMatch(/@media \(max-width:\s*767px\)[\s\S]*?\.contact-form-control\s*\{[^}]*height:\s*44px/s);
    expect(css).toContain("@keyframes contact-character-notice-blink");
    expect(css).toContain("@keyframes contact-char-success");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(contactCss).not.toContain("transition-all");
    expect(contactCss).not.toContain("--contact-body-tilt");
    expect(contactCss).not.toContain("pointer-follow");
    expect(hookSource).not.toContain("addEventListener(\"mousemove\"");
    expect(eyeSource).not.toContain("addEventListener");
    expect(hookSource).toContain("requestAnimationFrame");
  });

  it("keeps the contact h1 styled across desktop, mobile, and compact-height layouts", () => {
    const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

    expect(css).toMatch(/\.contact-form-panel__heading h1\s*\{[^}]*font-size:\s*28px/s);
    expect(css).toMatch(/@media \(max-width:\s*767px\)[\s\S]*?\.contact-form-panel__heading h1\s*\{[^}]*font-size:\s*25px/s);
    expect(css).toMatch(/@media \(max-height:\s*840px\) and \(min-width:\s*1024px\)[\s\S]*?\.contact-form-panel__heading h1\s*\{[^}]*margin-top:\s*2px[^}]*line-height:\s*1\.2/s);
  });

  it("gives every character its own rhythm and separates breathing from event poses", () => {
    const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
    const contactCss = css.slice(css.indexOf("/* Contact experience v2 */"));

    expect(contactCss).toMatch(/\.contact-character--purple\s*\{[^}]*--pose-duration:\s*410ms[^}]*--breathe-duration:\s*5\.8s[^}]*--character-origin:\s*46% 100%/s);
    expect(contactCss).toMatch(/\.contact-character--black\s*\{[^}]*--pose-duration:\s*360ms[^}]*--breathe-duration:\s*4\.9s[^}]*--character-origin:\s*54% 100%/s);
    expect(contactCss).toMatch(/\.contact-character--orange\s*\{[^}]*--pose-duration:\s*330ms[^}]*--breathe-duration:\s*6\.6s[^}]*--character-origin:\s*58% 100%[^}]*width:\s*38%[^}]*height:\s*46%/s);
    expect(contactCss).toMatch(/\.contact-character--yellow\s*\{[^}]*--pose-duration:\s*390ms[^}]*--breathe-duration:\s*5\.4s[^}]*--character-origin:\s*42% 100%/s);
    expect(contactCss).toMatch(/\.contact-character--black\s*\{[^}]*height:\s*82%/s);
    expect(contactCss).toMatch(/\.contact-character-breath\s*\{[^}]*animation-duration:\s*var\(--breathe-duration\)/s);
    expect(contactCss).toMatch(/\.contact-character-body\s*\{[^}]*clip-path:\s*var\(--character-clip\)/s);
    expect(contactCss).toMatch(/\[data-scene="privacy"\]\[data-phase="act"\][^{]*#contact-character-purple\s*\{[^}]*--character-x:\s*18px/s);
    expect(contactCss).toMatch(/\[data-scene="privacy"\]\[data-phase="act"\][^{]*#contact-character-black\s*\{[^}]*--character-x:\s*8px/s);
  });

  it("keeps transformed character bodies visually rooted with clipped color bleed", () => {
    const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

    expect(css).toMatch(/\.contact-character\s*\{[^}]*--character-base-bleed:\s*42px/s);
    expect(css).toMatch(/\.contact-character::after\s*\{[^}]*bottom:\s*calc\(0px - var\(--character-base-bleed\)\)/s);
    expect(css).toMatch(/\.contact-character::after\s*\{[^}]*height:\s*calc\(var\(--character-base-bleed\) \+ 4px\)/s);
    expect(css).toMatch(/\.contact-character::after\s*\{[^}]*background:\s*var\(--character-fill\)/s);
    expect(css).toMatch(/\.contact-character--purple\s*\{[^}]*--character-fill:\s*#6c3ff5/s);
    expect(css).toMatch(/\.contact-character--black\s*\{[^}]*--character-fill:\s*#222225/s);
    expect(css).toMatch(/\.contact-character--orange\s*\{[^}]*--character-fill:\s*#ff8a5c/s);
    expect(css).toMatch(/\.contact-character--yellow\s*\{[^}]*--character-fill:\s*#ead64d/s);
  });

  it("fits the complete D form inside a compact desktop viewport", () => {
    const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
    const compactStart = css.indexOf("@media (max-height: 840px) and (min-width: 1024px)");
    const compactEnd = css.indexOf("@media (prefers-reduced-motion: reduce)", compactStart);
    const compactCss = css.slice(compactStart, compactEnd);

    expect(compactStart).toBeGreaterThan(-1);
    expect(compactCss).toMatch(/\.contact-page-stage\s*\{[^}]*padding-block:\s*7px/s);
    expect(compactCss).toMatch(/\.contact-interactive-shell\s*\{[^}]*height:\s*auto/s);
    expect(compactCss).toMatch(/\.contact-interactive-shell\s*\{[^}]*min-height:\s*0/s);
    expect(compactCss).toMatch(/\.contact-form-panel\s*\{[^}]*padding:\s*14px 34px/s);
    expect(compactCss).toMatch(/\.contact-form-panel__fields\s*\{[^}]*row-gap:\s*16px/s);
    expect(compactCss).toMatch(/\.contact-form-submit\s*\{[^}]*margin-top:\s*10px/s);
    expect(compactCss).not.toContain("height: min(680px, calc(100dvh - 5rem))");
  });

  it("resets a restored scroll position when the Contact form mounts", () => {
    const scrollTo = vi.mocked(window.scrollTo);
    const requestFrame = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });

    renderContactForm();

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
    requestFrame.mockRestore();
  });

  it("shows every field together and preserves entered values", () => {
    renderContactForm();

    expect(screen.getByLabelText("姓名")).toBeTruthy();
    expect(screen.getByLabelText("手机号")).toBeTruthy();
    expect(screen.getByLabelText("机构/工作室")).toBeTruthy();
    expect(screen.getByLabelText("邮箱")).toBeTruthy();
    expect(screen.getByLabelText("客户类型")).toBeTruthy();
    expect(screen.getByLabelText("需求类型")).toBeTruthy();
    expect(screen.getByLabelText("资产类型")).toBeTruthy();
    expect(screen.getByLabelText("平台或链接")).toBeTruthy();
    expect(screen.getByLabelText("需求描述")).toBeTruthy();
    expect(screen.getByLabelText("我已阅读《隐私政策》，并同意为回复本次询问处理我提交的信息")).toBeTruthy();

    completeBasicFields();
    expect((screen.getByLabelText("姓名") as HTMLInputElement).value).toBe("张三");
  });

  it("marks every invalid field while expanding only the first error message", () => {
    renderContactForm();

    fireEvent.click(screen.getByRole("button", { name: "提交需求" }));

    expect(screen.getByText("请填写姓名")).toBeTruthy();
    expect(screen.queryByText("请填写有效的中国大陆手机号")).toBeNull();
    expect(screen.getByLabelText("手机号").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("status").textContent).toContain("7 项内容需要完善");
    expect(document.querySelector(".contact-character-stage")?.getAttribute("data-state")).toBe("error");
  });

  it("communicates required and optional fields without changing accessible field names", () => {
    renderContactForm();

    expect(screen.getByLabelText("姓名").getAttribute("aria-required")).toBe("true");
    expect(screen.getByLabelText("手机号").getAttribute("aria-required")).toBeNull();
    expect(screen.getByLabelText("邮箱").getAttribute("aria-required")).toBeNull();
    expect(screen.getByLabelText("机构/工作室").getAttribute("aria-required")).toBeNull();
    expect(screen.getByLabelText("需求描述").getAttribute("aria-required")).toBe("true");
    expect(screen.getByLabelText("平台或链接").getAttribute("aria-required")).toBeNull();
    expect(screen.getAllByText("选填")).toHaveLength(2);
    expect(screen.getByText("至少 10 字")).toBeTruthy();
  });

  it("groups phone and email with optional individual semantics and a persistent hint", () => {
    renderContactForm();

    const group = screen.getByRole("group", {
      name: "联系方式（手机号或邮箱至少填写一项）"
    });
    const phone = screen.getByLabelText("手机号");
    const email = screen.getByLabelText("邮箱");

    expect(within(group).getByLabelText("手机号")).toBe(phone);
    expect(within(group).getByLabelText("邮箱")).toBe(email);
    expect(group.querySelector(".contact-form-field__required")).toBeNull();
    expect(phone.getAttribute("aria-required")).toBeNull();
    expect(email.getAttribute("aria-required")).toBeNull();
    expect(phone.getAttribute("aria-describedby")).toBe("contact-method-hint");
    expect(email.getAttribute("aria-describedby")).toBe("contact-method-hint");
    expect(document.getElementById("contact-method-hint")).not.toBeNull();
  });

  it("shows one shared contact-method error and maps first-error focus to phone", () => {
    renderContactForm();
    completeRequiredFields({ phone: "", email: "" });

    fireEvent.click(screen.getByRole("button", { name: "提交需求" }));

    expect(screen.getByText("请至少填写手机号或邮箱中的一项").id).toBe("contactMethod-error");
    expect(screen.getByRole("status").textContent).toContain("1 项内容需要完善");
    expect(screen.getByLabelText("手机号").getAttribute("aria-describedby")).toBe(
      "contact-method-hint contactMethod-error"
    );
    expect(screen.getByLabelText("邮箱").getAttribute("aria-describedby")).toBe(
      "contact-method-hint contactMethod-error"
    );
    expect(document.activeElement?.id).toBe("phone");
  });

  it("associates an individual phone format error without a duplicate group error", () => {
    renderContactForm();
    completeRequiredFields({ phone: "123", email: "" });

    fireEvent.click(screen.getByRole("button", { name: "提交需求" }));

    expect(screen.getByText("请填写有效的中国大陆手机号").id).toBe("phone-error");
    expect(screen.queryByText("请至少填写手机号或邮箱中的一项")).toBeNull();
    expect(screen.getByLabelText("手机号").getAttribute("aria-describedby")).toBe(
      "contact-method-hint phone-error"
    );
    expect(screen.getByLabelText("邮箱").getAttribute("aria-describedby")).toBe("contact-method-hint");
  });

  it("associates an individual email format error without a duplicate group error", () => {
    renderContactForm();
    completeRequiredFields({ phone: "", email: "bad-email" });

    fireEvent.click(screen.getByRole("button", { name: "提交需求" }));

    expect(screen.getByText("请填写有效邮箱").id).toBe("email-error");
    expect(screen.queryByText("请至少填写手机号或邮箱中的一项")).toBeNull();
    expect(screen.getByLabelText("手机号").getAttribute("aria-describedby")).toBe("contact-method-hint");
    expect(screen.getByLabelText("邮箱").getAttribute("aria-describedby")).toBe(
      "contact-method-hint email-error"
    );
  });

  it("keeps consent, policy, disclaimer, and submit as separate ordered targets", async () => {
    const user = userEvent.setup();
    renderContactForm();

    const checkbox = screen.getByRole("checkbox", {
      name: "我已阅读《隐私政策》，并同意为回复本次询问处理我提交的信息"
    }) as HTMLInputElement;
    const privacyLink = screen.getByRole("link", { name: /隐私政策/ });
    const disclaimerLink = screen.getByRole("link", { name: "免责声明" });
    const submitButton = screen.getByRole("button", { name: "提交需求" });

    expect(checkbox.checked).toBe(false);
    expect(privacyLink.id).toBe("privacy-policy-link");
    expect(privacyLink.getAttribute("target")).toBe("_blank");
    expect(privacyLink.getAttribute("rel")?.split(/\s+/)).toEqual(
      expect.arrayContaining(["noopener", "noreferrer"])
    );
    expect(privacyLink.closest("label")).toBeNull();
    expect(disclaimerLink.getAttribute("href")).toBe("/disclaimer");

    privacyLink.addEventListener("click", (event) => event.preventDefault(), { once: true });
    fireEvent.click(privacyLink);
    expect(checkbox.checked).toBe(false);

    screen.getByLabelText("需求描述").focus();
    await user.tab();
    expect(document.activeElement).toBe(checkbox);
    await user.tab();
    expect(document.activeElement).toBe(privacyLink);
    await user.tab();
    expect(document.activeElement).toBe(disclaimerLink);
    await user.tab();
    expect(document.activeElement).toBe(submitButton);
  });

  it("associates the sensitive-material warning and renders the child notice", () => {
    renderContactForm();

    const message = screen.getByLabelText("需求描述");
    expect(screen.getByText(SENSITIVE_MATERIAL_WARNING).id).toBe("sensitive-material-warning");
    expect(message.getAttribute("aria-describedby")?.split(/\s+/)).toContain(
      "sensitive-material-warning"
    );
    expect(screen.getByText(CHILD_CONTACT_NOTICE)).toBeTruthy();
  });

  it("validates a field after it is visited and clears the message when corrected", async () => {
    const user = userEvent.setup();
    renderContactForm();

    const email = screen.getByLabelText("邮箱");
    await user.click(email);
    expect(document.activeElement).toBe(email);
    expect(screen.queryByText("请填写姓名")).toBeNull();
    await user.type(email, "bad-email");

    const customerType = screen.getByLabelText("客户类型");
    await user.click(customerType);
    expect(document.activeElement).toBe(customerType);

    expect(screen.getByText("请填写有效邮箱")).toBeTruthy();
    expect(screen.queryByText("请填写姓名")).toBeNull();

    await user.click(email);
    await user.clear(email);
    await user.type(email, "demo@example.com");

    expect(screen.queryByText("请填写有效邮箱")).toBeNull();
    expect(email.getAttribute("aria-invalid")).toBeNull();
  });

  it("maps every form field into the unified seven-state character system", () => {
    expect(getFieldCharacterState("name")).toBe("focused");
    expect(getFieldCharacterState("organization")).toBe("focused");
    expect(getFieldCharacterState("phone")).toBe("privacy");
    expect(getFieldCharacterState("email")).toBe("privacy");
    expect(getFieldCharacterState("customerType")).toBe("focused");
    expect(getFieldCharacterState("needType")).toBe("focused");
    expect(getFieldCharacterState("assetType")).toBe("focused");
    expect(getFieldCharacterState("platformUrl")).toBe("focused");
    expect(getFieldCharacterState("message")).toBe("typing");
    expect(getFieldCharacterState("consent")).toBe("focused");
  });

  it("prioritizes success, submission, and errors over field state", () => {
    expect(resolveCharacterState({})).toBe("idle");
    expect(resolveCharacterState({ activeField: "name" })).toBe("focused");
    expect(resolveCharacterState({ activeField: "email" })).toBe("privacy");
    expect(resolveCharacterState({ activeField: "message" })).toBe("typing");
    expect(resolveCharacterState({ activeField: "name", hasValidationError: true })).toBe("error");
    expect(resolveCharacterState({ activeField: "name", submitError: true })).toBe("error");
    expect(resolveCharacterState({ activeField: "name", submitting: true })).toBe("submitting");
    expect(resolveCharacterState({ activeField: "name", success: true })).toBe("success");
  });

  it("looks curious for basic fields and privacy-aware for contact fields", () => {
    renderContactForm();
    const stage = document.querySelector(".contact-character-stage");

    expect(stage?.getAttribute("data-state")).toBe("idle");

    fireEvent.focus(screen.getByLabelText("姓名"));
    expect(stage?.getAttribute("data-state")).toBe("focused");

    fireEvent.blur(screen.getByLabelText("姓名"));
    fireEvent.focus(screen.getByLabelText("邮箱"));
    expect(stage?.getAttribute("data-state")).toBe("privacy");
  });

  it("keeps the protected expression when a synthetic blur leaves the field focused", () => {
    renderContactForm();
    const stage = document.querySelector(".contact-character-stage");
    const email = screen.getByLabelText("邮箱");

    act(() => email.focus());
    expect(document.activeElement).toBe(email);
    expect(stage?.getAttribute("data-state")).toBe("privacy");

    fireEvent.blur(email);
    expect(document.activeElement).toBe(email);
    expect(stage?.getAttribute("data-state")).toBe("privacy");
  });

  it("restores the privacy expression when an already focused field is clicked again", () => {
    renderContactForm();
    const stage = document.querySelector(".contact-character-stage");
    const email = screen.getByLabelText("邮箱");

    fireEvent.pointerDown(email);
    expect(stage?.getAttribute("data-state")).toBe("privacy");
  });

  it("uses a listening state for the service description field", () => {
    renderContactForm();
    const stage = document.querySelector(".contact-character-stage");

    fireEvent.focus(screen.getByLabelText("需求描述"));
    expect(stage?.getAttribute("data-state")).toBe("typing");
  });
});
