import { Container } from "@/components/common/Container";
import surfaceStyles from "@/components/common/FluentSurface.module.css";
import { SectionHeader } from "@/components/common/SectionHeader";
import { serviceFlow } from "@/content/company";
import styles from "./HomeProcess.module.css";

export function HomeProcess() {
  return (
    <section
      className={`scroll-reveal ${styles.section}`}
      data-process-layout="traceable"
      data-service-closure-stage="delivery"
    >
      <Container className={styles.container}>
        <SectionHeader
          eyebrow="服务流程"
          title="从资产识别到合规使用，形成可追溯闭环"
          description="以清晰对象、可信记录和协同处置为基础，连接认证、监测、维权与授权。"
          className={styles.intro}
        />

        <ol className={styles.processList} role="list">
          {serviceFlow.map((item) => (
            <li
              key={item.step}
              className={`${styles.processItem} ${surfaceStyles.data}`}
              data-process-step={item.step}
              data-fluent-surface="data"
            >
              <div className={styles.markerTrack}>
                <span className={styles.stepNode}>{item.step}</span>
              </div>
              <div className={styles.stepBody}>
                <span className={styles.recordStatus}>可信记录</span>
                <h3 className={styles.stepTitle}>{item.title}</h3>
                <p className={styles.stepDescription}>{item.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
