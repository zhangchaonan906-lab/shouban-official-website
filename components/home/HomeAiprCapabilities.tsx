import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/common/Container";
import surfaceStyles from "@/components/common/FluentSurface.module.css";
import gradientStyles from "@/components/common/SectionGradient.module.css";
import { aiprModules, aiprPositioning } from "@/content/aipr";
import styles from "./HomeAiprCapabilities.module.css";

export function HomeAiprCapabilities() {
  return (
    <section
      className={`${styles.section} ${gradientStyles.ivoryToWhite}`}
      data-aipr-tone="warm-light"
    >
      <Container className={styles.container}>
        <div className={styles.layout}>
          <div className={styles.intro}>
            <p className={styles.eyebrow}>{aiprPositioning.name}</p>
            <h2 className={styles.title}>
              以可信记录连接认证、监测、维权与授权
            </h2>
            <p className={styles.description}>{aiprPositioning.description}</p>
            <Link href="/aipr" className={styles.link}>
              了解星眸AIPR
              <ArrowRight className={styles.linkIcon} aria-hidden="true" />
            </Link>
          </div>

          <ol className={styles.capabilityList} role="list">
            {aiprModules.map((module, index) => {
              const Icon = module.icon;
              const capabilityNumber = String(index + 1).padStart(2, "0");

              return (
                <li
                  key={module.title}
                  className={`${styles.capabilityItem} ${surfaceStyles.data}`}
                  data-fluent-surface="data"
                  data-aipr-capability={capabilityNumber}
                >
                  <span className={styles.capabilityNumber} aria-hidden="true">
                    {capabilityNumber}
                  </span>
                  <div className={styles.capabilityBody}>
                    <div className={styles.capabilityHeading}>
                      <Icon className={styles.capabilityIcon} aria-hidden="true" />
                      <h3 className={styles.capabilityTitle}>{module.title}</h3>
                    </div>
                    <p className={styles.capabilityDescription}>
                      {module.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </Container>
    </section>
  );
}
