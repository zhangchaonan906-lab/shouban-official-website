import type { Metadata } from "next";
import { Container } from "@/components/common/Container";
import { CTASection } from "@/components/common/CTASection";
import { FeatureCard } from "@/components/common/FeatureCard";
import { InteriorPageFrame } from "@/components/common/InteriorPageFrame";
import { PageHero } from "@/components/common/PageHero";
import { SectionBand } from "@/components/common/SectionBand";
import { aiprModules, aiprPositioning, aiprPrinciples } from "@/content/aipr";
import { createPageMetadata } from "@/lib/seo";
import surfaceStyles from "@/components/common/FluentSurface.module.css";

export const metadata: Metadata = createPageMetadata(
  aiprPositioning.name,
  aiprPositioning.description,
  "/aipr"
);

export default function AiprPage() {
  return (
    <InteriorPageFrame>
      <PageHero
        eyebrow="核心平台"
        title={`星眸AIPR｜${aiprPositioning.title}`}
        description={aiprPositioning.description}
      />
      <SectionBand tone="blueToIvory">
        <Container>
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-semibold text-[#3347b8]">五个能力模块</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
              围绕数字人格权资产建立认证、监测、维权与授权闭环
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {aiprModules.map((module) => (
              <FeatureCard
                key={module.title}
                title={module.title}
                description={module.description}
                icon={module.icon}
                points={module.points}
              />
            ))}
          </div>
        </Container>
      </SectionBand>
      <SectionBand tone="ivoryToWhite">
        <Container>
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-semibold text-[#3347b8]">平台原则</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
              星眸AIPR第一阶段坚持可登记、可追溯、可协同
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {aiprPrinciples.map((principle) => {
              const Icon = principle.icon;

              return (
                <article
                  key={principle.title}
                  data-fluent-surface="data"
                  className={`${surfaceStyles.data} p-6`}
                >
                  <div className={`${surfaceStyles.icon} flex h-11 w-11 items-center justify-center text-[#3347b8]`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-slate-950">{principle.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{principle.description}</p>
                </article>
              );
            })}
          </div>
        </Container>
      </SectionBand>
      <CTASection title="需要了解星眸AIPR如何承接首版认证？" />
    </InteriorPageFrame>
  );
}
