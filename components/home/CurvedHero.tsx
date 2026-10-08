import type { CSSProperties } from "react";
import Link from "next/link";
import { curvedHeroCards } from "@/content/home";
import { CurvedHeroScene } from "./CurvedHeroScene";
import styles from "./CurvedHero.module.css";

const desktopCurveIndexes = Array.from({ length: 16 }, (_, index) => index);
const mobileArcIndexes = Array.from({ length: 4 }, (_, index) => index);

export function CurvedHero() {
  return (
    <section
      className={styles.hero}
      data-curved-hero="true"
      aria-labelledby="curved-hero-title"
      aria-describedby="curved-hero-description"
    >
      <div className={styles.content} data-curved-hero-content>
        <p className={styles.eyebrow}>
          <span className={styles.eyebrowDot} aria-hidden="true" />
          {"\u6570\u5b57\u4eba\u683c\u6743\u8d44\u4ea7\u670d\u52a1"}
        </p>
        <h1 id="curved-hero-title" className={styles.title}>
          {"AIGC\u65f6\u4ee3\uff0c"}
          <span
            className={styles.titleAccent}
            data-curved-hero-title-accent
          >
            {"\u53ef\u4fe1\u6570\u5b57\u4eba\u683c\u6743\u8d44\u4ea7"}
          </span>
          {"\u57fa\u7840\u8bbe\u65bd"}
        </h1>
        <p id="curved-hero-description" className={styles.description}>
          {"\u9762\u5411\u827a\u4eba\u3001\u521b\u4f5c\u8005\u3001\u7ecf\u7eaa\u673a\u6784\u3001\u54c1\u724c\u65b9\u3001\u5e73\u53f0\u4f01\u4e1a\u4e0eAI\u516c\u53f8\uff0c\u63d0\u4f9b\u8ba4\u8bc1\u3001\u786e\u6743\u3001\u76d1\u6d4b\u3001\u7ef4\u6743\u4e0e\u6388\u6743\u670d\u52a1\u3002"}
        </p>
      </div>
      <div className={styles.actions} data-curved-hero-actions>
        <Link className={styles.primaryAction} href="/services">
          {"\u4e86\u89e3\u670d\u52a1"}
        </Link>
        <Link className={styles.secondaryAction} href="/contact">
          {"\u9884\u7ea6\u54a8\u8be2"}
        </Link>
      </div>
      <span
        className={styles.focusGlow}
        data-curved-hero-focus-glow
        aria-hidden="true"
      />
      <span className={styles.background} aria-hidden="true" />
      <div className={styles.sideCurves} aria-hidden="true">
        {(["left", "right"] as const).map((side) => (
          <span
            key={side}
            className={`${styles.curveField} ${styles[`${side}Curves`]}`}
            data-curved-hero-curve-side={side}
          >
            {desktopCurveIndexes.map((index) => (
              <span
                key={index}
                className={styles.curveStroke}
                data-curved-hero-curve
                style={
                  {
                    "--curve-width": `${220 + index * 27}px`,
                    "--curve-height": `${150 + index * 18}px`,
                    "--curve-edge": `${-148 - index * 20}px`,
                    "--curve-top": `${44 + (index % 5) * 3}%`,
                    "--curve-delay": `${index * -0.22}s`
                  } as CSSProperties
                }
              />
            ))}
          </span>
        ))}
      </div>
      <div className={styles.mobileArcs} aria-hidden="true">
        {mobileArcIndexes.map((index) => (
          <span
            key={index}
            className={styles.mobileArc}
            data-curved-hero-mobile-arc
            style={
              {
                "--mobile-arc-width": `${190 + index * 76}px`,
                "--mobile-arc-top": `${-124 + index * 13}px`,
                "--mobile-arc-delay": `${index * -0.7}s`
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className={styles.fallback} aria-hidden="true">
        {curvedHeroCards.map((card, index) => (
          <span
            key={card.id}
            className={styles.fallbackCard}
            data-curved-hero-fallback-card
            data-slot={index}
            aria-hidden="true"
            style={
              card.src
                ? ({
                    "--fallback-image": `url("${card.src}")`
                  } as CSSProperties)
                : undefined
            }
          />
        ))}
        <span className={styles.horizon} aria-hidden="true" />
      </div>
      <CurvedHeroScene cards={curvedHeroCards} />
      <span className={styles.bottomTransition} aria-hidden="true" />
    </section>
  );
}
