import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/common/Container";
import { InteriorPageFrame } from "@/components/common/InteriorPageFrame";
import { SectionBand } from "@/components/common/SectionBand";
import { getResearchItem, researchItems } from "@/content/research";
import { createPageMetadata } from "@/lib/seo";
import surfaceStyles from "@/components/common/FluentSurface.module.css";

type NewsDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return researchItems.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: NewsDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = getResearchItem(slug);

  if (!item) {
    return createPageMetadata("新闻与研究", "首版认证新闻与研究内容");
  }

  return createPageMetadata(item.title, item.summary);
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { slug } = await params;
  const item = getResearchItem(slug);

  if (!item) {
    notFound();
  }

  return (
    <InteriorPageFrame>
      <SectionBand as="article" tone="blueToWhite">
        <Container>
          <div
            data-fluent-surface="standard"
            className={`${surfaceStyles.standard} mx-auto max-w-3xl p-6 sm:p-10`}
          >
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="rounded-md bg-[#edf3ff] px-2 py-1 font-semibold text-[#3347b8]">{item.category}</span>
              <time dateTime={item.date}>{item.date}</time>
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-[#0b132b] sm:text-5xl">{item.title}</h1>
            <p className="mt-6 text-lg leading-8 text-[rgba(11,19,43,0.68)]">{item.summary}</p>
            <div className="mt-10 space-y-6 border-t border-[rgba(51,71,184,0.16)] pt-10 text-base leading-8 text-[rgba(11,19,43,0.76)]">
              {item.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </Container>
      </SectionBand>
    </InteriorPageFrame>
  );
}
