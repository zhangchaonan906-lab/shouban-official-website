import type { Metadata } from "next";
import { Container } from "@/components/common/Container";
import { CTASection } from "@/components/common/CTASection";
import { InteriorPageFrame } from "@/components/common/InteriorPageFrame";
import { PageHero } from "@/components/common/PageHero";
import { SectionBand } from "@/components/common/SectionBand";
import { complianceIntro, complianceTopics } from "@/content/compliance";
import { createPageMetadata } from "@/lib/seo";
import surfaceStyles from "@/components/common/FluentSurface.module.css";

export const metadata: Metadata = createPageMetadata(
  complianceIntro.title,
  complianceIntro.description,
  "/compliance"
);

export default function CompliancePage() {
  return (
    <InteriorPageFrame>
      <PageHero eyebrow="合规与研究" title={complianceIntro.title} description={complianceIntro.description} />
      <SectionBand tone="blueToWhite">
        <Container>
          <div className="grid gap-5 lg:grid-cols-2">
            {complianceTopics.map((topic) => (
              <article
                key={topic.title}
                data-fluent-surface="standard"
                className={`${surfaceStyles.standard} p-6`}
              >
                <h2 className="text-2xl font-semibold leading-snug text-slate-950">{topic.title}</h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">{topic.description}</p>
              </article>
            ))}
          </div>
        </Container>
      </SectionBand>
      <CTASection
        title="申请获取数字人格权资产合规研究资料"
        description="如需了解首版认证第一阶段可公开资料、研究主题与合作沟通口径，欢迎提交需求申请获取资料。"
      />
    </InteriorPageFrame>
  );
}
