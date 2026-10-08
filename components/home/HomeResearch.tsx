import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Container } from "@/components/common/Container";
import surfaceStyles from "@/components/common/FluentSurface.module.css";
import gradientStyles from "@/components/common/SectionGradient.module.css";
import { complianceTopics } from "@/content/compliance";
import { parentCompanyQualifications } from "@/content/qualifications";
import { researchItems } from "@/content/research";
import { QualificationCarousel } from "./QualificationCarousel";
import styles from "./HomeResearch.module.css";

export function HomeResearch() {
  const [featuredResearch, ...secondaryResearch] = researchItems.slice(0, 3);

  return (
    <>
      <section
        className={`scroll-reveal ${styles.qualificationsSection} ${gradientStyles.whiteToBlue}`}
        aria-labelledby="parent-company-qualifications-title"
      >
        <Container className={styles.qualificationsContainer}>
          <header className={styles.qualificationsHeader}>
            <p className={styles.eyebrow}>可信基础</p>
            <h2
              id="parent-company-qualifications-title"
              className={styles.qualificationsTitle}
            >
              母公司资质与行业认可
            </h2>
          </header>

          <QualificationCarousel qualifications={parentCompanyQualifications} />
        </Container>
      </section>

      <section
        className={`${styles.researchSection} ${gradientStyles.blueToIvory}`}
        aria-labelledby="home-research-title"
      >
        <Container>
          <header className={styles.researchHeader}>
            <p className={styles.researchEyebrow}>研究与动态</p>
            <h2 id="home-research-title" className={styles.researchTitle}>
              持续关注AIGC内容生态的权利与合规边界
            </h2>
            <p className={styles.researchDescription}>
              以类型化研究梳理人格权、著作权、数据合规、平台治理和商业授权问题。
            </p>
          </header>

          <div className={styles.researchLayout}>
            <div className={styles.complianceColumn}>
              <div className={styles.columnHeader}>
                <h3>合规研究</h3>
                <Link href="/compliance" className={styles.headerLink}>
                  查看专题
                  <ArrowRight aria-hidden="true" />
                </Link>
              </div>
              <div className={styles.complianceList}>
                {complianceTopics.slice(0, 3).map((topic) => (
                  <Link
                    key={topic.title}
                    href="/compliance"
                    className={`${styles.complianceLink} ${surfaceStyles.standard}`}
                    data-research-entry
                    data-fluent-surface="standard"
                  >
                    <span className={styles.complianceLinkTitle}>
                      {topic.title}
                      <ArrowUpRight aria-hidden="true" />
                    </span>
                    <span className={styles.complianceDescription}>
                      {topic.description}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className={styles.newsColumn}>
              <div className={styles.columnHeader}>
                <h3>新闻与研究</h3>
                <Link href="/news" className={styles.headerLink}>
                  查看全部
                  <ArrowRight aria-hidden="true" />
                </Link>
              </div>

              {featuredResearch ? (
                <Link
                  href={`/news/${featuredResearch.slug}`}
                  className={`${styles.featuredResearch} ${surfaceStyles.standard}`}
                  data-research-entry
                  data-fluent-surface="standard"
                >
                  <span className={styles.researchMeta}>
                    <span>{featuredResearch.category}</span>
                    <time dateTime={featuredResearch.date}>
                      {featuredResearch.date}
                    </time>
                  </span>
                  <span className={styles.featuredResearchTitle}>
                    {featuredResearch.title}
                    <ArrowUpRight aria-hidden="true" />
                  </span>
                  <span className={styles.featuredResearchSummary}>
                    {featuredResearch.summary}
                  </span>
                </Link>
              ) : null}

              <div className={styles.secondaryResearchList}>
                {secondaryResearch.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/news/${item.slug}`}
                    className={`${styles.secondaryResearchLink} ${surfaceStyles.standard}`}
                    data-research-entry
                    data-fluent-surface="standard"
                  >
                    <span className={styles.researchMeta}>
                      <span>{item.category}</span>
                      <time dateTime={item.date}>{item.date}</time>
                    </span>
                    <span className={styles.secondaryResearchTitle}>
                      {item.title}
                      <ArrowUpRight aria-hidden="true" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
