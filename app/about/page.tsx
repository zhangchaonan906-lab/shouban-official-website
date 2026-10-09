import type { Metadata } from "next";
import { Container } from "@/components/common/Container";
import { CTASection } from "@/components/common/CTASection";
import { FeatureCard } from "@/components/common/FeatureCard";
import { InteriorPageFrame } from "@/components/common/InteriorPageFrame";
import { PageHero } from "@/components/common/PageHero";
import { SectionBand } from "@/components/common/SectionBand";
import { SectionHeader } from "@/components/common/SectionHeader";
import { BookOpenCheck, Network, ShieldCheck } from "lucide-react";
import { company, pageIntros } from "@/content/company";
import { createPageMetadata } from "@/lib/seo";
import surfaceStyles from "@/components/common/FluentSurface.module.css";

export const metadata: Metadata = createPageMetadata(
  pageIntros.about.title,
  pageIntros.about.description,
  "/about"
);

const capabilityBlocks = [
  {
    title: "版权与行业服务基础",
    description: "围绕权利对象识别、材料整理、证据留存和服务边界说明，承接数字人格权资产进入认证、监测与维权流程前的基础工作。",
    points: ["权利对象梳理", "材料与证据整理", "服务边界说明"],
    icon: BookOpenCheck
  },
  {
    title: "平台与内容生态协同",
    description: "面向平台、内容机构、品牌合作方和行业组织，提供类型化沟通入口与可持续沉淀的资产、线索和授权信息结构。",
    points: ["内容场景识别", "线索归集协同", "授权信息留痕"],
    icon: Network
  },
  {
    title: "AI声像与数字人格权治理",
    description: "关注声音声纹、肖像影像、数字分身和AIGC生成内容中的人格权使用边界，支持认证、监测、维权与授权管理。",
    points: ["声音声纹治理", "肖像影像治理", "AIGC使用边界"],
    icon: ShieldCheck
  }
];

export default function AboutPage() {
  return (
    <InteriorPageFrame>
      <PageHero {...pageIntros.about} />
      <SectionBand tone="blueToIvory">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <SectionHeader
              eyebrow="公司定位"
              title={company.name}
              description={company.description}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {capabilityBlocks.map((item) => (
                <FeatureCard key={item.title} {...item} />
              ))}
            </div>
          </div>
        </Container>
      </SectionBand>
      <SectionBand tone="ivoryToWhite">
        <Container>
          <SectionHeader
            eyebrow="第一阶段边界"
            title="以可信表达承接公开官网展示"
            description="第一阶段官网聚焦静态内容、服务说明和文本表单入口，不展示未验证实验室、标准、专利、真实客户或业务数据等具体承诺。"
          />
          <div
            data-fluent-surface="standard"
            className={`${surfaceStyles.standard} mt-10 p-6 text-sm leading-7 text-[rgba(11,19,43,0.72)]`}
          >
            官网内容以公司定位、服务方向、合规边界和联系方式为主，后续如需补充资质、案例、合作方或运营数据，应以公司已确认材料为准。
          </div>
        </Container>
      </SectionBand>
      <CTASection
        title="想进一步了解首版认证，或沟通具体需求？"
        description="可围绕数字人格权资产、星眸AIPR、服务组合和合规研究方向提交沟通需求；正式联系方式仍以公司确认信息为准。"
      />
    </InteriorPageFrame>
  );
}
