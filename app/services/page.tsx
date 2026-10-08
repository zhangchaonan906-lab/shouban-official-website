import type { Metadata } from "next";
import { Container } from "@/components/common/Container";
import { CTASection } from "@/components/common/CTASection";
import { FeatureCard } from "@/components/common/FeatureCard";
import { InteriorPageFrame } from "@/components/common/InteriorPageFrame";
import { PageHero } from "@/components/common/PageHero";
import { SectionBand } from "@/components/common/SectionBand";
import { pageIntros } from "@/content/company";
import { services } from "@/content/services";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata(pageIntros.services.title, pageIntros.services.description);

export default function ServicesPage() {
  return (
    <InteriorPageFrame>
      <PageHero
        {...pageIntros.services}
        title="服务与产品"
        description="围绕数字人格权资产认证、侵权监测、证据固定、维权协同与商业授权，提供第一阶段可落地的服务产品组合。"
      />
      <SectionBand tone="blueToWhite">
        <Container>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => (
              <FeatureCard
                key={service.title}
                title={service.title}
                description={service.description}
                icon={service.icon}
                points={service.points}
              />
            ))}
          </div>
        </Container>
      </SectionBand>
      <CTASection title="需要组合多类数字人格权资产服务？" />
    </InteriorPageFrame>
  );
}
