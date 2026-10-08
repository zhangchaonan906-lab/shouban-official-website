import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/common/Container";
import { aiprModules, aiprPositioning } from "@/content/aipr";

export function PlatformSection() {
  return (
    <section className="bg-[#f7faff] py-16 text-slate-950 sm:py-20">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold text-sky-700">{aiprPositioning.name}</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">{aiprPositioning.title}</h2>
            <p className="mt-5 text-base leading-8 text-slate-600">{aiprPositioning.description}</p>
            <Link href="/aipr" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-slate-950">
              了解星眸AIPR
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {aiprModules.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-lg border border-slate-200 bg-white/90 p-5 shadow-sm shadow-slate-200/70 transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80"
                >
                  <Icon className="h-5 w-5 text-blue-600" aria-hidden="true" />
                  <h3 className="mt-4 text-base font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
