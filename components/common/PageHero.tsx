import { Container } from "@/components/common/Container";
import { Badge } from "@/components/ui/badge";
import styles from "./PageHero.module.css";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHero({ eyebrow, title, description }: PageHeroProps) {
  return (
    <section
      className={`${styles.hero} text-[#0b132b]`}
      data-interior-page-hero="true"
    >
      <div className={styles.glowPrimary} aria-hidden="true" />
      <Container className={styles.container}>
        <Badge className={styles.badge}>
          {eyebrow}
        </Badge>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
      </Container>
    </section>
  );
}
