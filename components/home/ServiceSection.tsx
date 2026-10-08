import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/common/Container";
import { FeatureCard } from "@/components/common/FeatureCard";
import { SectionHeader } from "@/components/common/SectionHeader";
import { services } from "@/content/services";

export function ServiceSection() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <Container>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            eyebrow="服务产品"
            title="围绕数字人格权资产全生命周期的六类服务"
            description="从资产认证、声音声纹、肖像影像到AIGC侵权监测、证据固定和商业授权，形成第一阶段可沟通、可落地的服务组合。"
          />
          <Link href="/services" className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-900">
            查看全部服务
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <FeatureCard
              key={service.title}
              title={service.title}
              description={service.summary}
              icon={service.icon}
              points={service.points}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
