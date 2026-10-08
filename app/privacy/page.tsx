import type { Metadata } from "next";
import { Container } from "@/components/common/Container";
import { InteriorPageFrame } from "@/components/common/InteriorPageFrame";
import { PageHero } from "@/components/common/PageHero";
import { SectionBand } from "@/components/common/SectionBand";
import { PrivacyPolicy } from "@/components/privacy/PrivacyPolicy";
import { legalPages } from "@/content/legal";
import { getContactCollectionReadiness } from "@/lib/privacy-readiness.server";
import { createPageMetadata } from "@/lib/seo";

const page = legalPages.privacy;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function generateMetadata(): Metadata {
  const readiness = getContactCollectionReadiness();

  if (!readiness.ready) {
    return {
      ...createPageMetadata("隐私政策草案", page.description),
      robots: { index: false, follow: true }
    };
  }

  return {
    ...createPageMetadata(page.title, page.effectiveDescription),
    robots: { index: true, follow: true }
  };
}

export default function PrivacyPage() {
  const readiness = getContactCollectionReadiness();

  if (readiness.ready) {
    return (
      <InteriorPageFrame>
        <div className="privacy-page">
          <PageHero
            eyebrow="法律信息"
            title={page.title}
            description={page.effectiveDescription}
          />
          <SectionBand
            tone="blueToWhite"
            className="privacy-policy-section"
            aria-label="隐私政策正文"
          >
            <PrivacyPolicy config={readiness.publicConfig} />
          </SectionBand>
        </div>
      </InteriorPageFrame>
    );
  }

  return (
    <InteriorPageFrame>
      <div className="privacy-page">
        <PageHero
          eyebrow="法律信息"
          title={page.draftTitle}
          description={page.description}
        />
        <SectionBand
          tone="blueToWhite"
          className="privacy-policy-section"
          aria-label="隐私政策草案说明"
        >
          <Container>
            <article className="privacy-policy privacy-policy--draft">
              <section className="privacy-policy__section">
                <h2>当前状态</h2>
                <p>{page.sections[0]}</p>
                <p>在线联系表单当前未开放；应用层不读取、处理或转发表单正文。</p>
              </section>
              <section className="privacy-policy__section">
                <h2>生效条件</h2>
                <p>{page.sections[1]}</p>
              </section>
              <section className="privacy-policy__section">
                <h2>生效后的披露范围</h2>
                <p>{page.sections[2]}</p>
              </section>
            </article>
          </Container>
        </SectionBand>
      </div>
    </InteriorPageFrame>
  );
}
