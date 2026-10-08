"use client";

import {
  BadgeCheck,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  Handshake,
  Radar,
  ShieldCheck
} from "lucide-react";
import { type KeyboardEvent, useEffect, useRef } from "react";
import { Container } from "@/components/common/Container";
import surfaceStyles from "@/components/common/FluentSurface.module.css";
import styles from "./HomeScenarioStrip.module.css";

const scenarios = [
  {
    title: "认证",
    description: "建立数字人格权资产的可信记录与权属档案。",
    tags: ["可信记录", "权属档案"],
    icon: BadgeCheck
  },
  {
    title: "监测",
    description: "面向 AIGC 内容传播场景，持续发现疑似侵权线索。",
    tags: ["风险线索", "持续监测"],
    icon: Radar
  },
  {
    title: "维权",
    description: "围绕证据固定、线索整理和处置协同形成服务闭环。",
    tags: ["证据固定", "协同处置"],
    icon: ShieldCheck
  },
  {
    title: "授权",
    description: "梳理授权边界、使用场景与商业合作记录。",
    tags: ["授权边界", "使用留痕"],
    icon: Handshake
  },
  {
    title: "研究",
    description: "沉淀数字人格权资产与内容治理的合规研究能力。",
    tags: ["合规研究", "内容治理"],
    icon: BookOpenCheck
  }
] as const;

export function HomeScenarioStrip() {
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const strip = stripRef.current;
      const firstCard = strip?.querySelector<HTMLElement>(
        "[data-scenario-card]"
      );

      if (
        !strip ||
        !firstCard ||
        strip.scrollLeft !== 0 ||
        strip.scrollWidth <= strip.clientWidth
      ) {
        return;
      }

      strip.scrollLeft = Math.min(
        firstCard.getBoundingClientRect().width * 0.32,
        112
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const scrollByCard = (direction: "left" | "right") => {
    const strip = stripRef.current;

    if (!strip) {
      return;
    }

    const firstCard = strip.querySelector<HTMLElement>(
      "[data-scenario-card]"
    );
    const rail = firstCard?.parentElement;
    const railStyles = rail ? window.getComputedStyle(rail) : null;
    const gap = Number.parseFloat(
      railStyles?.columnGap || railStyles?.gap || "0"
    );
    const cardWidth = firstCard?.getBoundingClientRect().width ?? 0;
    const distance =
      cardWidth > 0
        ? cardWidth + (Number.isFinite(gap) ? gap : 0)
        : Math.min(strip.clientWidth * 0.78, 420);
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    strip.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: prefersReducedMotion ? "auto" : "smooth"
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    scrollByCard(event.key === "ArrowLeft" ? "left" : "right");
  };

  return (
    <section
      className={`scroll-reveal ${styles.section}`}
      aria-label="服务场景与能力入口"
      role="region"
      data-scenario-layout="glass-text-carousel"
      data-service-closure-stage="scenario"
    >
      <Container className={styles.container}>
        <div className={styles.header}>
          <div className={styles.intro}>
            <p className={styles.eyebrow}>服务能力</p>
            <h2 className={styles.title}>
              <span className={styles.titleAccent}>服务场景</span>
              <span> 与能力入口</span>
            </h2>
          </div>
        </div>

        <div
          ref={stripRef}
          className={styles.viewport}
          onKeyDown={handleKeyDown}
        >
          <ol className={styles.rail} role="list">
            {scenarios.map((scenario, index) => {
              const Icon = scenario.icon;
              const number = String(index + 1).padStart(2, "0");

              return (
                <li
                  key={scenario.title}
                  className={styles.railItem}
                  data-scenario-card
                >
                  <article
                    aria-label={scenario.title}
                    className={`${styles.card} ${surfaceStyles.elevated}`}
                    data-fluent-surface="elevated"
                    tabIndex={0}
                  >
                    <div className={styles.cardHeader}>
                      <span className={styles.cardNumber}>{number}</span>
                      <span className={styles.iconFrame} aria-hidden="true">
                        <Icon className={styles.cardIcon} />
                      </span>
                    </div>

                    <div className={styles.cardBody}>
                      <p className={styles.cardKicker}>数字人格权服务</p>
                      <h3 className={styles.cardTitle}>{scenario.title}</h3>
                      <p className={styles.cardDescription}>
                        {scenario.description}
                      </p>
                    </div>

                    <div
                      className={styles.tagList}
                      aria-label={`${scenario.title}能力标签`}
                    >
                      {scenario.tags.map((tag) => (
                        <span
                          key={tag}
                          className={styles.tag}
                          data-scenario-tag
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        </div>

        <div className={styles.controls}>
          <button
            type="button"
            aria-label="向左浏览服务场景"
            onClick={() => scrollByCard("left")}
            className={`${styles.control} ${surfaceStyles.control}`}
            data-fluent-surface="control"
          >
            <ChevronLeft className={styles.controlIcon} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="向右浏览服务场景"
            onClick={() => scrollByCard("right")}
            className={`${styles.control} ${surfaceStyles.control}`}
            data-fluent-surface="control"
          >
            <ChevronRight className={styles.controlIcon} aria-hidden="true" />
          </button>
        </div>
      </Container>
    </section>
  );
}
