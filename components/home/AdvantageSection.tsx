import { AlertTriangle, CircleOff, EyeOff, FileWarning } from "lucide-react";
import { Container } from "@/components/common/Container";
import { FeatureCard } from "@/components/common/FeatureCard";
import { SectionHeader } from "@/components/common/SectionHeader";
import { serviceFlow } from "@/content/company";

export function AdvantageSection() {
  const riskCards = [
    {
      title: "被冒用",
      description: "AI声音、AI换脸、AI数字人内容被用于短视频、直播、电商、广告等场景。",
      icon: AlertTriangle
    },
    {
      title: "被误认",
      description: "公众误以为本人表达、本人授权或本人代言，损害商业信誉与长期形象。",
      icon: EyeOff
    },
    {
      title: "被消耗",
      description: "个人品牌、声音辨识度、肖像影响力被低成本盗用，资产价值被稀释。",
      icon: CircleOff
    },
    {
      title: "难处置",
      description: "线索分散、平台众多、取证难、定性难，单点维权成本高且难以沉淀。",
      icon: FileWarning
    }
  ];

  return (
    <section className="bg-white py-16 sm:py-20">
      <Container>
        <SectionHeader
          eyebrow="权利风险"
          title="AIGC正在制造新的权利风险"
          description="当声音、肖像、形象和数字分身被快速生成与传播，权利保护需要从事后处置走向资产化、流程化和可追溯。"
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {riskCards.map((item) => (
            <FeatureCard key={item.title} {...item} />
          ))}
        </div>
        <div className="mt-12 grid gap-4 lg:grid-cols-4">
          {serviceFlow.map((item) => (
            <article key={item.step} className="rounded-lg border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm font-semibold text-sky-700">{item.step}</p>
              <h3 className="mt-3 text-lg font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
