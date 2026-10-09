import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { InteriorPageFrame } from "@/components/common/InteriorPageFrame";
import { SectionBand } from "@/components/common/SectionBand";
import surfaceStyles from "@/components/common/FluentSurface.module.css";
import { ContactForm } from "@/components/forms/ContactForm";
import { pageIntros } from "@/content/company";
import { getContactCollectionReadiness } from "@/lib/privacy-readiness.server";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata(
  pageIntros.contact.title,
  pageIntros.contact.description,
  "/contact"
);
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ContactPage() {
  const readiness = getContactCollectionReadiness();

  if (!readiness.ready) {
    return (
      <InteriorPageFrame>
        <SectionBand
          tone="blueToWhite"
          className="contact-page-stage contact-page-stage--readiness"
        >
          <article
            className={`${surfaceStyles.elevated} w-full max-w-2xl p-8 text-center sm:p-12`}
            data-fluent-surface="elevated"
          >
          <h1 className="text-3xl font-bold text-slate-950">联系功能准备中</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            联系表单将在隐私政策与邮件服务准备完成后开放，感谢您的理解。
          </p>
          <Link
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md px-3 font-semibold text-sky-700 outline-none hover:text-sky-900 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
            href="/privacy"
          >
            查看隐私政策草案
          </Link>
          </article>
        </SectionBand>
      </InteriorPageFrame>
    );
  }

  return (
    <InteriorPageFrame>
      <SectionBand tone="blueToWhite" className="contact-page-stage">
        <Suspense
          fallback={
            <div
              className={`contact-interactive-shell contact-interactive-shell--loading ${surfaceStyles.elevated}`}
              data-fluent-surface="elevated"
            />
          }
        >
          <ContactForm
            privacyPolicyVersion={readiness.publicConfig.policyVersion}
            privacyPolicyEffectiveDate={readiness.publicConfig.effectiveDate}
            privacyPolicySnapshotId={readiness.publicConfig.privacyPolicySnapshotId}
          />
        </Suspense>
      </SectionBand>
    </InteriorPageFrame>
  );
}
