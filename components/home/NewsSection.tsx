import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/common/Container";
import { SectionHeader } from "@/components/common/SectionHeader";
import { researchItems } from "@/content/research";

export function NewsSection() {
  return (
    <section className="bg-slate-50 py-16 sm:py-20">
      <Container>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            eyebrow="新闻与研究"
            title="关注AIGC、人格权与IP权益基础设施"
            description="第一阶段以行业观察、合规研究和产品能力解读为主，不披露未经确认的客户、案件或数据。"
          />
          <Link href="/news" className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-900">
            查看更多研究
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {researchItems.slice(0, 3).map((item) => (
            <Link key={item.slug} href={`/news/${item.slug}`} className="group rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-sky-200">
              <div className="flex items-center justify-between gap-4 text-xs text-slate-500">
                <span className="rounded-md bg-sky-50 px-2 py-1 font-semibold text-sky-700">{item.category}</span>
                <span>{item.date}</span>
              </div>
              <h3 className="mt-5 text-xl font-semibold leading-snug text-slate-950 group-hover:text-sky-800">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.summary}</p>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
