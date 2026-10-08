import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Container } from "@/components/common/Container";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { company, homeStats } from "@/content/company";

export function Hero() {
  const chips = ["认证", "确权", "监测", "维权", "授权"];

  return (
    <section className="relative overflow-hidden bg-[#f7faff] text-slate-950">
      <Image
        src="/images/shouban-hero.png"
        alt="首版认证数字人格权资产服务视觉"
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-20"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(247,250,255,0.98),rgba(247,250,255,0.88)_48%,rgba(247,250,255,0.6)),linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,250,255,0.78))]" />
      <div className="absolute inset-0 bg-grid-light opacity-60" />
      <Container className="relative flex min-h-[calc(78svh-4rem)] flex-col justify-center py-16 sm:py-20">
        <div className="max-w-4xl">
          <Badge className="border-sky-200 bg-white/80 text-sky-700 shadow-sm">AIGC时代数字人格权资产</Badge>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
            {company.heroTitle}
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">{company.heroDescription}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/contact?type=assessment" className={buttonVariants({ variant: "secondary", size: "lg" })}>
              申请IP权益体检
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/contact?type=lead"
              className={buttonVariants({
                variant: "secondary",
                size: "lg"
              })}
            >
              提交疑似侵权线索
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {chips.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white/75 px-3 py-2 text-xs text-slate-700 shadow-sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                {keyword}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-12 grid max-w-3xl gap-5 border-t border-slate-200 pt-6 sm:grid-cols-3">
          {homeStats.map((item) => (
            <div key={item.label}>
              <p className="text-2xl font-semibold text-slate-950">{item.value}</p>
              <p className="mt-1 text-xs font-medium text-sky-700">{item.label}</p>
              <p className="mt-2 text-xs leading-5 text-slate-600">{item.note}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
