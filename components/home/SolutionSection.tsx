import { Container } from "@/components/common/Container";
import { FeatureCard } from "@/components/common/FeatureCard";
import { SectionHeader } from "@/components/common/SectionHeader";
import { customerScenarios } from "@/content/company";

export function SolutionSection() {
  return (
    <section className="bg-slate-50 py-16 sm:py-20">
      <Container>
        <SectionHeader
          eyebrow="客户场景"
          title="面向权利人、机构、品牌和平台组织"
          description="首版认证第一阶段聚焦数字人格权资产的真实需求入口，用类型化场景说明服务边界，不展示未经确认的客户名称与数据。"
          align="center"
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {customerScenarios.map((scenario) => (
            <FeatureCard key={scenario.title} {...scenario} />
          ))}
        </div>
      </Container>
    </section>
  );
}
