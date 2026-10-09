import type { Metadata } from "next";
import { Container } from "@/components/common/Container";
import { CTASection } from "@/components/common/CTASection";
import { InteriorPageFrame } from "@/components/common/InteriorPageFrame";
import { PageHero } from "@/components/common/PageHero";
import { SectionBand } from "@/components/common/SectionBand";
import { SectionHeader } from "@/components/common/SectionHeader";
import { trustBoundaries, trustIntro, trustTopics } from "@/content/trust";
import { createPageMetadata } from "@/lib/seo";
import surfaceStyles from "@/components/common/FluentSurface.module.css";

export const metadata: Metadata = createPageMetadata(
  trustIntro.title,
  trustIntro.description,
  "/trust"
);

export default function TrustPage() {
  return (
    <InteriorPageFrame>
      <PageHero {...trustIntro} />
      <SectionBand tone="blueToIvory">
        <Container>
          <SectionHeader
            eyebrow="工作原则"
            title="让每一类输出都能说明来源、过程与适用范围"
            description="可信不是单一技术标签，而是由记录结构、复核机制、权限边界和克制表达共同构成。"
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {trustTopics.map((topic, index) => (
              <article
                key={topic.title}
                data-fluent-surface="standard"
                className={`${surfaceStyles.standard} p-6`}
              >
                <span className="font-mono text-xs font-semibold text-[#3347b8]">
                  TRUST {String(index + 1).padStart(2, "0")}
                </span>
                <h2 className="mt-4 text-2xl font-semibold leading-snug text-[#0b132b]">
                  {topic.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-[rgba(11,19,43,0.68)]">
                  {topic.description}
                </p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {topic.points.map((point) => (
                    <li
                      key={point}
                      className="rounded-full border border-[rgba(51,71,184,0.14)] bg-[#edf3ff] px-3 py-1 text-xs text-[#3347b8]"
                    >
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </Container>
      </SectionBand>

      <SectionBand tone="ivoryToWhite" className="text-[#0b132b]">
        <Container>
          <SectionHeader
            eyebrow="公开结论边界"
            title="明确什么可以说明，也明确什么不能替代"
            description="以下边界适用于官网公开内容和前期业务沟通；具体项目仍以确认材料和正式协议为准。"
          />
          <ol className="mt-10 grid gap-4 md:grid-cols-2">
            {trustBoundaries.map((boundary, index) => (
              <li
                key={boundary}
                data-fluent-surface="data"
                className={`${surfaceStyles.data} flex gap-4 p-5 text-sm leading-7 text-[rgba(11,19,43,0.72)]`}
              >
                <span className="font-mono text-xs font-semibold text-[#3347b8]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{boundary}</span>
              </li>
            ))}
          </ol>
        </Container>
      </SectionBand>
      <CTASection title="需要确认具体能力、数据与交付边界？" />
    </InteriorPageFrame>
  );
}
