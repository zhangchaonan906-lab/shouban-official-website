import type { Metadata } from "next";
import { Container } from "@/components/common/Container";
import { InteriorPageFrame } from "@/components/common/InteriorPageFrame";
import { PageHero } from "@/components/common/PageHero";
import { SectionBand } from "@/components/common/SectionBand";
import { legalPages } from "@/content/legal";
import { createPageMetadata } from "@/lib/seo";
import surfaceStyles from "@/components/common/FluentSurface.module.css";

const page = legalPages.disclaimer;

export const metadata: Metadata = createPageMetadata(page.title, page.description);

export default function DisclaimerPage() {
  return (
    <InteriorPageFrame>
      <PageHero eyebrow="法律信息" title={page.title} description={page.description} />
      <SectionBand tone="blueToWhite">
        <Container>
          <article
            data-fluent-surface="standard"
            className={`${surfaceStyles.standard} mx-auto max-w-3xl p-6 sm:p-8`}
          >
            <div className="space-y-5 text-base leading-8 text-slate-700">
              {page.sections.map((section) => (
                <p key={section}>{section}</p>
              ))}
            </div>
          </article>
        </Container>
      </SectionBand>
    </InteriorPageFrame>
  );
}
