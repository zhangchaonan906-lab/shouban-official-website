import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/common/Container";
import { CTASection } from "@/components/common/CTASection";
import { InteriorPageFrame } from "@/components/common/InteriorPageFrame";
import { PageHero } from "@/components/common/PageHero";
import { SectionBand } from "@/components/common/SectionBand";
import { SectionHeader } from "@/components/common/SectionHeader";
import { serviceFlow } from "@/content/company";
import { solutions, solutionsIntro } from "@/content/solutions";
import { createPageMetadata } from "@/lib/seo";
import surfaceStyles from "@/components/common/FluentSurface.module.css";

export const metadata: Metadata = createPageMetadata(
  solutionsIntro.title,
  solutionsIntro.description
);

export default function SolutionsPage() {
  return (
    <InteriorPageFrame>
      <PageHero {...solutionsIntro} />
      <SectionBand tone="blueToIvory">
        <Container>
          <SectionHeader
            eyebrow="适用角色"
            title="从业务场景出发，找到更清晰的服务组合"
            description="以下内容用于帮助不同角色理解可讨论的服务方向，不代表固定产品包或结果承诺。"
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {solutions.map((solution, index) => (
              <article
                id={solution.id}
                key={solution.id}
                data-fluent-surface="standard"
                className={`${surfaceStyles.standard} scroll-mt-24 p-6`}
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-semibold text-[#3347b8]">
                    {solution.audience}
                  </p>
                  <span className="font-mono text-xs text-[rgba(11,19,43,0.68)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-semibold leading-snug text-[#0b132b]">
                  {solution.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-[rgba(11,19,43,0.68)]">
                  {solution.description}
                </p>
                <ul className="mt-5 space-y-2 text-sm text-[rgba(11,19,43,0.68)]">
                  {solution.capabilities.map((capability) => (
                    <li key={capability} className="flex gap-2">
                      <span
                        className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-[#3347b8]"
                        aria-hidden="true"
                      />
                      <span>{capability}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </Container>
      </SectionBand>

      <SectionBand tone="ivoryToWhite">
        <Container>
          <SectionHeader
            eyebrow="通用协作路径"
            title="先厘清对象和边界，再组合具体服务"
            description="项目通常从需求和材料梳理开始，实际步骤、参与方与交付范围需在沟通后确认。"
          />
          <ol className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {serviceFlow.map((item) => (
              <li
                key={item.step}
                data-fluent-surface="data"
                className={`${surfaceStyles.data} p-6`}
              >
                <span className="font-mono text-sm font-semibold text-[#3347b8]">
                  {item.step}
                </span>
                <h2 className="mt-4 text-xl font-semibold text-slate-950">
                  {item.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {item.description}
                </p>
              </li>
            ))}
          </ol>
          <Link
            href="/trust"
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#3347b8] outline-none hover:text-[#0b132b] focus-visible:ring-2 focus-visible:ring-[#3347b8] focus-visible:ring-offset-4"
          >
            查看技术与可信边界
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Container>
      </SectionBand>
      <CTASection title="需要按具体角色与场景梳理服务路径？" />
    </InteriorPageFrame>
  );
}
