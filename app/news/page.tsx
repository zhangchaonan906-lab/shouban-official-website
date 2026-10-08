import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/common/Container";
import { CTASection } from "@/components/common/CTASection";
import { InteriorPageFrame } from "@/components/common/InteriorPageFrame";
import { PageHero } from "@/components/common/PageHero";
import { SectionBand } from "@/components/common/SectionBand";
import { pageIntros } from "@/content/company";
import { researchItems } from "@/content/research";
import { createPageMetadata } from "@/lib/seo";
import surfaceStyles from "@/components/common/FluentSurface.module.css";

export const metadata: Metadata = createPageMetadata(pageIntros.news.title, pageIntros.news.description);

export default function NewsPage() {
  return (
    <InteriorPageFrame>
      <PageHero {...pageIntros.news} title="新闻与研究" />
      <SectionBand tone="blueToWhite">
        <Container>
          <div className="grid gap-5 lg:grid-cols-2">
            {researchItems.map((item) => (
              <Link key={item.slug} href={`/news/${item.slug}`} className="block rounded-[18px] outline-none focus-visible:ring-2 focus-visible:ring-[#3347b8] sm:rounded-[24px]">
                <article
                  data-fluent-surface="standard"
                  className={`${surfaceStyles.standard} h-full p-6 transition-[border-color,box-shadow] hover:border-[rgba(51,71,184,0.26)] hover:shadow-[var(--sb-shadow-elevated)]`}
                >
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[rgba(11,19,43,0.68)]">
                    <span className="rounded-md bg-[#edf3ff] px-2 py-1 font-semibold text-[#3347b8]">{item.category}</span>
                    <span>{item.date}</span>
                  </div>
                  <h2 className="mt-5 text-2xl font-semibold leading-snug text-[#0b132b] transition-colors hover:text-[#3347b8]">
                    {item.title}
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-[rgba(11,19,43,0.68)]">{item.summary}</p>
                </article>
              </Link>
            ))}
          </div>
        </Container>
      </SectionBand>
      <CTASection title="欢迎提供正式新闻素材以替换占位内容" />
    </InteriorPageFrame>
  );
}
