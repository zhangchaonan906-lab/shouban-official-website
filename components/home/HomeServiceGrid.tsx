import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/common/Container";
import surfaceStyles from "@/components/common/FluentSurface.module.css";
import { SectionHeader } from "@/components/common/SectionHeader";
import { services } from "@/content/services";
import styles from "./HomeServiceGrid.module.css";

export function HomeServiceGrid() {
  return (
    <section
      className={`scroll-reveal ${styles.section}`}
      data-service-layout="editorial"
      data-service-closure-stage="services"
    >
      <Container className={styles.container}>
        <div className={styles.header}>
          <SectionHeader
            eyebrow="服务产品"
            title="覆盖数字人格权资产全生命周期"
            description="围绕资产认证、声音声纹、肖像影像、侵权监测、证据固定和商业授权，形成清晰的服务组合。"
            className={styles.intro}
          />
          <Link
            href="/services"
            className={styles.allServicesLink}
          >
            查看全部服务
            <ArrowUpRight className={styles.allServicesIcon} aria-hidden="true" />
          </Link>
        </div>

        <ol className={styles.serviceList} role="list">
          {services.map((service, index) => {
            const Icon = service.icon;
            const serviceNumber = String(index + 1).padStart(2, "0");
            const emphasis = index < 2 ? "featured" : "compact";
            const emphasisClass =
              emphasis === "featured" ? styles.featuredItem : styles.compactItem;
            const surface = emphasis === "featured" ? "standard" : "data";
            const surfaceClass =
              surface === "standard" ? surfaceStyles.standard : surfaceStyles.data;

            return (
              <li
                key={service.title}
                className={`${styles.serviceItem} ${emphasisClass}`}
                data-service-entry={serviceNumber}
                data-service-emphasis={emphasis}
              >
                <Link
                  href="/services"
                  className={`${styles.serviceLink} ${surfaceClass}`}
                  data-fluent-surface={surface}
                >
                  <div className={styles.serviceMeta}>
                    <span className={styles.serviceNumber}>{serviceNumber}</span>
                    <span className={`${styles.iconFrame} ${surfaceStyles.icon}`}>
                      <Icon
                        className={styles.serviceIcon}
                        data-service-icon={service.title}
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                  <div className={styles.serviceBody}>
                    <h3 className={styles.serviceTitle}>{service.title}</h3>
                    <p className={styles.serviceSummary}>{service.summary}</p>
                  </div>
                  <ArrowUpRight
                    className={styles.entryArrow}
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}
