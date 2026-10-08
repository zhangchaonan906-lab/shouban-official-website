import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/common/Container";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import surfaceStyles from "./FluentSurface.module.css";
import styles from "./CTASection.module.css";

type CTASectionProps = {
  title?: string;
  description?: string;
  variant?: "default" | "home";
};

export function CTASection({
  title = "需要评估数字人格权资产风险？",
  description = "欢迎围绕声音声纹、肖像影像、数字分身、AIGC疑似侵权线索和合规授权需求与首版认证沟通。",
  variant = "default"
}: CTASectionProps) {
  const isHome = variant === "home";

  return (
    <section
      className={cn(
        "scroll-reveal",
        isHome && "home-contact-cta",
        styles.brandSurface,
        !isHome && styles.fluentSurface,
        !isHome && surfaceStyles.elevated
      )}
      aria-labelledby="home-contact-cta-title"
      data-cta-variant={variant}
      data-fluent-surface={isHome ? undefined : "elevated"}
    >
      <Container
        className={cn(
          isHome && "home-contact-cta__content",
          styles.brandContainer
        )}
      >
        <div
          className={cn(isHome && "home-contact-cta__copy", styles.brandCopy)}
        >
          <p
            className={cn("text-xs font-semibold", styles.brandEyebrow)}
          >
            {isHome ? "商务咨询" : "联系我们"}
          </p>
          <h2
            id="home-contact-cta-title"
            className={cn(
              "mt-4 text-3xl font-semibold leading-tight sm:text-4xl",
              styles.brandTitle
            )}
          >
            {title}
          </h2>
          <p
            className={cn(
              "mt-4 text-base leading-8",
              styles.brandDescription
            )}
          >
            {description}
          </p>
        </div>
        <Link
          href="/contact?type=assessment"
          className={cn(
            buttonVariants({ variant: "primary", size: "lg" }),
            isHome && "home-contact-cta__action",
            styles.brandAction
          )}
        >
          申请IP权益体检
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </Container>
    </section>
  );
}
