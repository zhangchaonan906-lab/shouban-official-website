import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/common/Container";
import surfaceStyles from "@/components/common/FluentSurface.module.css";
import gradientStyles from "@/components/common/SectionGradient.module.css";
import { company, customerScenarios } from "@/content/company";
import styles from "./HomePositioning.module.css";

export function HomePositioning() {
  return (
    <section
      className={`scroll-reveal ${styles.section} ${gradientStyles.blueToIvory}`}
      data-positioning-layout="editorial"
    >
      <Container className={styles.container}>
        <div className={styles.layout}>
          <div className={styles.intro}>
            <p className={styles.eyebrow}>公司定位</p>
            <h2 className={styles.title}>
              让数字人格权资产更清晰、更可信、更可持续
            </h2>
            <p className={styles.description}>{company.description}</p>
            <Link href="/about" className={styles.link}>
              了解首版认证
              <ArrowUpRight className={styles.linkIcon} aria-hidden="true" />
            </Link>
          </div>

          <div className={styles.scenarios}>
            <p className={styles.scenarioLabel}>
              服务面向企业、平台与创作者
            </p>
            <ol className={styles.scenarioList} role="list">
              {customerScenarios.map((scenario, index) => {
                const Icon = scenario.icon;
                const scenarioNumber = String(index + 1).padStart(2, "0");

                return (
                  <li
                    key={scenario.title}
                    className={`${styles.scenarioItem} ${surfaceStyles.standard}`}
                    data-fluent-surface="standard"
                    data-positioning-scenario={scenarioNumber}
                  >
                    <div className={styles.scenarioMeta}>
                      <span className={styles.scenarioNumber} aria-hidden="true">
                        {scenarioNumber}
                      </span>
                      <Icon className={styles.scenarioIcon} aria-hidden="true" />
                    </div>
                    <h3 className={styles.scenarioTitle}>
                      {scenario.title}
                    </h3>
                    <p className={styles.scenarioDescription}>
                      {scenario.description}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </Container>
    </section>
  );
}
