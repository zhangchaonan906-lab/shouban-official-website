"use client";

import { FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Sparkle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  assetTypes,
  contactFieldLimits,
  contactNeedTypes,
  customerTypes,
  type ContactFormErrorKey,
  type ContactFormErrors,
  type ContactPolicySubmissionMetadata,
  type ContactFormValues,
  validateContactForm
} from "@/lib/contact";
import { InteractiveContactShell } from "@/components/contact/interactive-contact-shell";
import { useCharacterInteraction } from "@/hooks/use-character-interaction";
import { cn } from "@/lib/utils";
import {
  CHILD_CONTACT_NOTICE,
  SENSITIVE_MATERIAL_WARNING
} from "@/lib/privacy-policy.mjs";

const initialValues: ContactFormValues = {
  name: "",
  phone: "",
  organization: "",
  email: "",
  customerType: "",
  needType: "",
  assetType: "",
  platformUrl: "",
  message: "",
  consent: false
};

const needTypePresets: Record<string, ContactFormValues["needType"]> = {
  assessment: "申请数字人格权资产体检",
  lead: "处理AI仿冒或侵权线索"
};

type TouchedFields = Partial<Record<keyof ContactFormValues, boolean>>;

const contactSubmitTimeoutMs = 10_000;
const contactFormErrorKeys: ContactFormErrorKey[] = [
  ...(Object.keys(initialValues) as (keyof ContactFormValues)[]),
  "contactMethod"
];

type ContactApiErrorBody = {
  code?: unknown;
  message?: unknown;
  errors?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readContactApiError(response: Response): Promise<ContactApiErrorBody | null> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    const body: unknown = await response.json();
    return isRecord(body) ? body : null;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    return null;
  }
}

function contactApiFieldErrors(value: unknown): ContactFormErrors {
  if (!isRecord(value)) {
    return {};
  }

  const result: ContactFormErrors = {};

  for (const field of contactFormErrorKeys) {
    if (typeof value[field] === "string") {
      result[field] = value[field];
    }
  }

  return result;
}

function isAbortError(error: unknown) {
  return isRecord(error) && error.name === "AbortError";
}

function fieldForError(errorKey: ContactFormErrorKey): keyof ContactFormValues {
  return errorKey === "contactMethod" ? "phone" : errorKey;
}

function describedBy(...ids: Array<string | false | null | undefined>) {
  const value = [...new Set(ids.filter((id): id is string => Boolean(id)))].join(" ");
  return value || undefined;
}

function validationKeysForField(field: keyof ContactFormValues): ContactFormErrorKey[] {
  return field === "phone" || field === "email" ? [field, "contactMethod"] : [field];
}

export function ContactForm({
  privacyPolicyVersion,
  privacyPolicyEffectiveDate,
  privacyPolicySnapshotId
}: ContactPolicySubmissionMetadata) {
  const searchParams = useSearchParams();
  const routeQuery = searchParams.toString();
  const presetNeedType = needTypePresets[searchParams.get("type") ?? ""] ?? "";
  const formInitialValues = useMemo(
    () => ({
      ...initialValues,
      needType: presetNeedType
    }),
    [presetNeedType]
  );

  const [values, setValues] = useState<ContactFormValues>(formInitialValues);
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [formMessage, setFormMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeField, setActiveField] = useState<keyof ContactFormValues | null>(null);
  const [typingSignal, setTypingSignal] = useState(0);
  const [touchedFields, setTouchedFields] = useState<TouchedFields>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const revisionRef = useRef(0);

  const errorCount = Object.values(errors).filter(Boolean).length;

  const {
    shellRef,
    shellPointerHandlers,
    interactionState,
    reducedMotion
  } = useCharacterInteraction({
    activeField,
    hasValidationError: submitAttempted && errorCount > 0,
    submitError: Boolean(formMessage),
    submitting,
    success,
    typingSignal
  });

  useEffect(() => {
    const resetScroll = () => window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    resetScroll();
    const frame = window.requestAnimationFrame(resetScroll);

    return () => window.cancelAnimationFrame(frame);
  }, [routeQuery]);

  useEffect(() => {
    if (!presetNeedType || values.needType === presetNeedType) {
      return;
    }

    revisionRef.current += 1;
    setValues((current) => ({ ...current, needType: presetNeedType }));
    setErrors((current) => ({ ...current, needType: undefined }));
  }, [presetNeedType]);

  function updateField<Field extends keyof ContactFormValues>(field: Field, value: ContactFormValues[Field]) {
    const nextValues = { ...values, [field]: value };
    revisionRef.current += 1;
    setValues(nextValues);

    if (
      touchedFields[field]
      || submitAttempted
      || errors[field]
      || ((field === "phone" || field === "email") && errors.contactMethod)
    ) {
      const validationErrors = validateContactForm(nextValues).errors;
      const errorKeys = validationKeysForField(field);
      setErrors((current) => {
        const nextErrors = { ...current };

        for (const errorKey of errorKeys) {
          if (validationErrors[errorKey]) {
            nextErrors[errorKey] = validationErrors[errorKey];
          } else {
            delete nextErrors[errorKey];
          }
        }

        return nextErrors;
      });
    }

    setFormMessage("");
    setSuccess(false);

    if (field === "message") {
      setTypingSignal((current) => current + 1);
    }
  }

  function activateField(field: keyof ContactFormValues) {
    setActiveField(field);
  }

  function deactivateField(field: keyof ContactFormValues) {
    if (document.activeElement?.getAttribute("name") === field) {
      return;
    }

    const validationErrors = validateContactForm(values).errors;
    const errorKeys = validationKeysForField(field);
    setTouchedFields((current) => ({ ...current, [field]: true }));
    setErrors((current) => {
      const nextErrors = { ...current };

      for (const errorKey of errorKeys) {
        if (validationErrors[errorKey]) {
          nextErrors[errorKey] = validationErrors[errorKey];
        } else {
          delete nextErrors[errorKey];
        }
      }

      return nextErrors;
    });
    setActiveField((current) => (current === field ? null : current));
  }

  function activatePointerField(event: ReactPointerEvent<HTMLFormElement>) {
    const field = (event.target as HTMLInputElement).name as keyof ContactFormValues | undefined;

    if (field && field in initialValues) {
      setActiveField(field);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const validation = validateContactForm(values);
    setErrors(validation.errors);
    setSubmitAttempted(true);

    if (!validation.success) {
      const [firstError] = Object.keys(validation.errors) as ContactFormErrorKey[];
      const firstErrorField = firstError ? fieldForError(firstError) : null;
      setActiveField(firstErrorField);
      setSuccess(false);
      if (firstErrorField) {
        window.requestAnimationFrame(() => document.getElementById(firstErrorField)?.focus());
      }
      return;
    }

    const submissionRevision = revisionRef.current;
    setActiveField(null);
    setSubmitting(true);
    const websiteValue = new FormData(form).get("website");
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), contactSubmitTimeoutMs);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          website: typeof websiteValue === "string" ? websiteValue : "",
          privacyPolicyVersion,
          privacyPolicyEffectiveDate,
          privacyPolicySnapshotId
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const body = await readContactApiError(response);

        if (response.status === 409 && body?.code === "CONTACT_POLICY_VERSION_MISMATCH") {
          setValues((current) => ({ ...current, consent: false }));
          setErrors({ consent: "请重新阅读隐私政策并再次勾选同意" });
          setTouchedFields((current) => ({ ...current, consent: true }));
          setFormMessage(
            typeof body.message === "string" && body.message.trim()
              ? body.message.trim()
              : "隐私政策已更新，请刷新页面后重新确认"
          );
          setSubmitAttempted(true);
          setSuccess(false);
          setActiveField(null);
          window.requestAnimationFrame(() => document.getElementById("privacy-policy-link")?.focus());
          return;
        }

        const responseErrors = contactApiFieldErrors(body?.errors);
        const [firstResponseError] = Object.keys(responseErrors) as ContactFormErrorKey[];
        const firstResponseErrorField = firstResponseError ? fieldForError(firstResponseError) : null;

        if (revisionRef.current === submissionRevision) {
          setFormMessage(
            response.status === 429
              ? "提交过于频繁，请稍后再试。"
              : typeof body?.message === "string" && body.message.trim()
                ? body.message.trim()
                : "提交失败，请稍后再试。"
          );
          setSuccess(false);
          setErrors(responseErrors);
          setActiveField(firstResponseErrorField);
          if (firstResponseErrorField) {
            window.requestAnimationFrame(() => document.getElementById(firstResponseErrorField)?.focus());
          }
        }
        return;
      }

      if (revisionRef.current === submissionRevision) {
        revisionRef.current += 1;
        setFormMessage("");
        setSuccess(true);
        setValues(formInitialValues);
        setErrors({});
        setTouchedFields({});
        setSubmitAttempted(false);
        setActiveField(null);
      }
    } catch (error) {
      if (revisionRef.current === submissionRevision) {
        setFormMessage(
          isAbortError(error)
            ? "提交超时，请稍后重试。"
            : "网络连接异常，请检查网络后重试。"
        );
        setSuccess(false);
      }
    } finally {
      window.clearTimeout(timeoutId);
      setSubmitting(false);
    }
  }

  function shouldShowFieldError(field: keyof ContactFormValues) {
    return Boolean(errors[field] && (touchedFields[field] || activeField === field));
  }

  function visibleFieldError(field: keyof ContactFormValues) {
    return shouldShowFieldError(field) ? errors[field] : undefined;
  }

  function shouldShowContactMethodError() {
    return Boolean(
      errors.contactMethod
      && (
        touchedFields.phone
        || touchedFields.email
        || activeField === "phone"
        || activeField === "email"
      )
    );
  }

  function fieldAria(
    field: keyof ContactFormValues,
    required = true,
    persistentDescriptionId?: string
  ) {
    const errorId = `${field}-error`;
    return {
      "aria-invalid": errors[field] ? true : undefined,
      "aria-describedby": describedBy(
        persistentDescriptionId,
        shouldShowFieldError(field) && errorId
      ),
      "aria-required": required ? true : undefined
    };
  }

  function contactMethodAria(field: "phone" | "email") {
    const groupErrorVisible = shouldShowContactMethodError();
    return {
      "aria-invalid": errors[field] || errors.contactMethod ? true : undefined,
      "aria-describedby": describedBy(
        "contact-method-hint",
        groupErrorVisible && "contactMethod-error",
        shouldShowFieldError(field) && `${field}-error`
      )
    };
  }

  return (
    <InteractiveContactShell
      shellRef={shellRef}
      state={interactionState}
      activeField={activeField}
      reducedMotion={reducedMotion}
      onSubmit={onSubmit}
      {...shellPointerHandlers}
      onPointerDownCapture={activatePointerField}
    >
      <div className="contact-form-panel__inner">
          <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
            <label htmlFor="website">网站</label>
            <input
              id="website"
              name="website"
              type="text"
              autoComplete="off"
              tabIndex={-1}
              aria-hidden="true"
              maxLength={contactFieldLimits.website}
            />
          </div>
          <Sparkle className="contact-form-panel__mark" aria-hidden="true" />
          <div className="contact-form-panel__heading">
            <span>北京首版认证有限公司</span>
            <h1 id="contact-title">提交服务需求</h1>
            <p>请填写您的基本信息与需求</p>
          </div>

          <div className="contact-form-panel__fields grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <Field id="name" label="姓名" required error={visibleFieldError("name")}>
              <input
                id="name"
                name="name"
                maxLength={contactFieldLimits.name}
                value={values.name}
                onChange={(event) => updateField("name", event.target.value)}
                onFocus={() => activateField("name")}
                onBlur={() => deactivateField("name")}
                className={inputClass}
                placeholder="请输入姓名"
                {...fieldAria("name")}
              />
            </Field>
            <fieldset className="contact-method-group sm:col-span-2">
              <legend>联系方式（手机号或邮箱至少填写一项）</legend>
              <p id="contact-method-hint" className="contact-method-group__hint">
                手机号或邮箱至少填写一项；如同时填写，两项都需要有效。
              </p>
              <div className="contact-method-group__fields">
                <Field id="phone" label="手机号" error={visibleFieldError("phone")}>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    maxLength={contactFieldLimits.phone}
                    value={values.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    onFocus={() => activateField("phone")}
                    onBlur={() => deactivateField("phone")}
                    className={inputClass}
                    placeholder="请输入手机号"
                    {...contactMethodAria("phone")}
                  />
                </Field>
                <Field id="email" label="邮箱" error={visibleFieldError("email")}>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    spellCheck={false}
                    maxLength={contactFieldLimits.email}
                    value={values.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    onFocus={() => activateField("email")}
                    onBlur={() => deactivateField("email")}
                    className={inputClass}
                    placeholder="请输入邮箱"
                    {...contactMethodAria("email")}
                  />
                </Field>
              </div>
              {shouldShowContactMethodError() ? (
                <span id="contactMethod-error" role="alert" className="contact-method-group__error">
                  {errors.contactMethod}
                </span>
              ) : null}
            </fieldset>
            <Field
              id="organization"
              label="机构/工作室"
              meta="选填"
              error={visibleFieldError("organization")}
            >
              <input
                id="organization"
                name="organization"
                maxLength={contactFieldLimits.organization}
                value={values.organization}
                onChange={(event) => updateField("organization", event.target.value)}
                onFocus={() => activateField("organization")}
                onBlur={() => deactivateField("organization")}
                className={inputClass}
                placeholder="请输入机构或工作室名称"
                {...fieldAria("organization", false)}
              />
            </Field>
            <Field id="customerType" label="客户类型" required error={visibleFieldError("customerType")}>
              <select
                id="customerType"
                name="customerType"
                value={values.customerType}
                onChange={(event) => updateField("customerType", event.target.value)}
                onFocus={() => activateField("customerType")}
                onBlur={() => deactivateField("customerType")}
                className={inputClass}
                {...fieldAria("customerType")}
              >
                <option value="">请选择客户类型</option>
                {customerTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="needType" label="需求类型" required error={visibleFieldError("needType")}>
              <select
                id="needType"
                name="needType"
                value={values.needType}
                onChange={(event) => updateField("needType", event.target.value)}
                onFocus={() => activateField("needType")}
                onBlur={() => deactivateField("needType")}
                className={inputClass}
                {...fieldAria("needType")}
              >
                <option value="">请选择需求类型</option>
                {contactNeedTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="assetType" label="资产类型" required error={visibleFieldError("assetType")}>
              <select
                id="assetType"
                name="assetType"
                value={values.assetType}
                onChange={(event) => updateField("assetType", event.target.value)}
                onFocus={() => activateField("assetType")}
                onBlur={() => deactivateField("assetType")}
                className={inputClass}
                {...fieldAria("assetType")}
              >
                <option value="">请选择资产类型</option>
                {assetTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="platformUrl" label="平台或链接" meta="选填" error={visibleFieldError("platformUrl")}>
              <input
                id="platformUrl"
                name="platformUrl"
                maxLength={contactFieldLimits.platformUrl}
                value={values.platformUrl}
                onChange={(event) => updateField("platformUrl", event.target.value)}
                onFocus={() => activateField("platformUrl")}
                onBlur={() => deactivateField("platformUrl")}
                className={inputClass}
                placeholder="https://example.com/risk-video"
                {...fieldAria("platformUrl", false)}
              />
            </Field>
            <Field
              id="message"
              label="需求描述"
              required
              meta="至少 10 字"
              error={visibleFieldError("message")}
              className="sm:col-span-2"
              description={(
                <span id="sensitive-material-warning" className="contact-form-field__description">
                  {SENSITIVE_MATERIAL_WARNING}
                </span>
              )}
            >
              <textarea
                id="message"
                name="message"
                maxLength={contactFieldLimits.message}
                value={values.message}
                onChange={(event) => updateField("message", event.target.value)}
                onFocus={() => activateField("message")}
                onBlur={() => deactivateField("message")}
                className={cn(inputClass, "contact-form-control--textarea")}
                placeholder="请简要描述数字人格权资产、疑似冒用场景或希望了解的流程"
                {...fieldAria("message", true, "sensitive-material-warning")}
              />
            </Field>
          </div>

          <p className="contact-form-child-notice">{CHILD_CONTACT_NOTICE}</p>

          <div className="contact-form-options-wrap">
            <div className="contact-form-options">
              <label htmlFor="consent" className="contact-form-consent">
                <input
                  id="consent"
                  name="consent"
                  type="checkbox"
                  checked={values.consent}
                  onChange={(event) => updateField("consent", event.target.checked)}
                  onFocus={() => activateField("consent")}
                  onBlur={() => deactivateField("consent")}
                  aria-invalid={errors.consent ? true : undefined}
                  aria-describedby={shouldShowFieldError("consent") ? "consent-error" : undefined}
                  aria-required="true"
                />
                <span>我已阅读《隐私政策》，并同意为回复本次询问处理我提交的信息</span>
              </label>
              <Link
                id="privacy-policy-link"
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                隐私政策<span className="sr-only">（在新标签页打开）</span>
              </Link>
              <Link href="/disclaimer">免责声明</Link>
            </div>
            {visibleFieldError("consent") ? (
              <span id="consent-error" role="alert" className="contact-form-options__error">
                {errors.consent}
              </span>
            ) : null}
          </div>

          {submitAttempted && errorCount > 0 ? (
            <p className="sr-only" role="status" aria-live="polite">
              {errorCount} 项内容需要完善，已定位到第一项。
            </p>
          ) : null}

          {formMessage ? (
            <div className="contact-form-message contact-form-message--error" aria-live="polite">
              {formMessage}
            </div>
          ) : null}

          {success ? (
            <div className="contact-form-message contact-form-message--success" aria-live="polite">
              <CheckCircle2 className="h-4 w-4 flex-none" aria-hidden="true" />
              <p>提交成功，首版认证工作人员会在后续与您联系并跟进需求。</p>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className="contact-form-submit"
          >
            {submitting ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : null}
            {submitting ? "正在提交…" : "提交需求"}
          </button>
      </div>
    </InteractiveContactShell>
  );
}

function Field({
  id,
  label,
  error,
  required = false,
  meta,
  description,
  children,
  className
}: {
  id: keyof ContactFormValues;
  label: string;
  error?: string;
  required?: boolean;
  meta?: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("contact-form-field", className)}>
      <div className="contact-form-field__label-row">
        <label htmlFor={id}>{label}</label>
        {required || meta ? (
          <span className="contact-form-field__meta" aria-hidden="true">
            {required ? <span className="contact-form-field__required">*</span> : null}
            {meta ? <span>{meta}</span> : null}
          </span>
        ) : null}
      </div>
      <span className="contact-form-field__control">{children}</span>
      {description}
      {error ? (
        <span id={`${id}-error`} role="alert" className="contact-form-field__error">
          {error}
        </span>
      ) : null}
    </div>
  );
}

const inputClass = "contact-form-control";
