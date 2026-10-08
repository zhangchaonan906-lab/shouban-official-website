"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FocusEvent } from "react";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/common/Container";
import { buttonVariants } from "@/components/ui/button";
import { heroSlides, type HeroSlide } from "@/content/home";
import {
  getNextSlideIndex,
  normalizeSlideIndex
} from "@/lib/carousel";
import { cn } from "@/lib/utils";

const AUTOPLAY_DELAY_MS = 6000;
const slideCount = heroSlides.length;
const heroTitleLines: Record<string, readonly string[]> = {
  "AIGC 时代的数字人格权资产认证服务": [
    "AIGC 时代的",
    "数字人格权资产",
    "认证服务"
  ],
  "星眸AIPR：让数字人格权资产可识别、可追踪、可保护": [
    "星眸AIPR：让数字人格权资产",
    "可识别、可追踪、可保护"
  ],
  "面向未来内容生态的合规基础设施": [
    "面向未来内容生态的",
    "合规基础设施"
  ]
};

function FormattedHeroTitle({ title }: { title: string }) {
  const lines = heroTitleLines[title];

  if (!lines) {
    return title;
  }

  return (
    <>
      {lines.map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
    </>
  );
}

function MonitoringVisual() {
  return (
    <div className="hero-monitoring-visual" aria-hidden="true">
      <div className="hero-grid" />
      <div className="hero-scanline" />
      <span className="hero-data-node hero-data-node--one" />
      <span className="hero-data-node hero-data-node--two" />
      <span className="hero-data-node hero-data-node--three" />
      <div className="hero-monitoring-panels">
        <div className="hero-status-panel">
          <div className="hero-status-panel__header">
            <span>AIGC 内容识别</span>
            <span className="hero-status hero-status--live">运行中</span>
          </div>
          <div className="hero-metric">98.7%</div>
          <div className="hero-meter">
            <span style={{ width: "86%" }} />
          </div>
        </div>
        <div className="hero-status-panel">
          <div className="hero-status-panel__header">
            <span>全网风险监测</span>
            <span className="hero-status">24H</span>
          </div>
          <div className="hero-signal-bars">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="hero-status-panel">
          <div className="hero-status-panel__header">
            <span>可信证据链</span>
            <span className="hero-status hero-status--secure">已核验</span>
          </div>
          <div className="hero-event-row">
            <span>特征比对</span>
            <span>证据固化</span>
            <span>风险处置</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComplianceVisual() {
  return (
    <div className="hero-compliance-visual" aria-hidden="true">
      <div className="hero-boundary-network">
        <span className="hero-network-node hero-network-node--one" />
        <span className="hero-network-node hero-network-node--two" />
        <span className="hero-network-node hero-network-node--three" />
        <span className="hero-network-node hero-network-node--four" />
      </div>
      <div className="hero-compliance-stack">
        <div className="hero-compliance-panel">
          <span>身份可信边界</span>
          <strong>PASS</strong>
        </div>
        <div className="hero-compliance-panel">
          <span>内容授权记录</span>
          <strong>VERIFIED</strong>
        </div>
        <div className="hero-compliance-panel">
          <span>合规策略校验</span>
          <strong>READY</strong>
        </div>
      </div>
      <div className="hero-compliance-rail">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function SlideVisual({ slide }: { slide: HeroSlide }) {
  if (slide.visual === "image") {
    return (
      <>
        <Image
          src={slide.image}
          alt="北京首版认证办公园区外景"
          fill
          preload
          sizes="(min-width: 1280px) 650px, (min-width: 1024px) calc(56vw - 67px), (min-width: 640px) calc(100vw - 48px), calc(100vw - 32px)"
          className="object-cover object-[52%_center] sm:object-center"
        />
        <div className="hero-image-overlay" aria-hidden="true" />
      </>
    );
  }

  if (slide.visual === "monitoring") {
    return <MonitoringVisual />;
  }

  return <ComplianceVisual />;
}

export function HeroImageCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const [timerResetToken, setTimerResetToken] = useState(0);
  const [manualAnnouncement, setManualAnnouncement] = useState("");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => {
      setAutoplayEnabled(!mediaQuery.matches);
    };

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);

    return () => {
      mediaQuery.removeEventListener("change", updateMotionPreference);
    };
  }, []);

  useEffect(() => {
    if (!autoplayEnabled || isHovered || isFocusWithin) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setActiveIndex((currentIndex) =>
        getNextSlideIndex(currentIndex, slideCount)
      );
    }, AUTOPLAY_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    activeIndex,
    autoplayEnabled,
    isFocusWithin,
    isHovered,
    timerResetToken
  ]);

  const goToSlide = (index: number) => {
    const nextIndex = normalizeSlideIndex(index, slideCount);

    setActiveIndex(nextIndex);
    setTimerResetToken((token) => token + 1);
    setManualAnnouncement(
      `已切换到第 ${nextIndex + 1} 屏，共 ${slideCount} 屏`
    );
  };

  const showSlide = (index: number) => {
    goToSlide(index);
  };

  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsFocusWithin(false);
    }
  };

  return (
    <section
      className="hero-carousel relative min-h-[680px] overflow-hidden bg-[#f7faff] text-slate-950 sm:min-h-[720px]"
      aria-roledescription="carousel"
      aria-label="首版认证首页主视觉"
      data-active-visual={heroSlides[activeIndex].visual}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocusWithin(true)}
      onBlurCapture={handleBlur}
    >
      {heroSlides.map((slide, index) => {
        const isActive = index === activeIndex;
        const Heading = index === 0 ? "h1" : "h2";

        return (
          <article
            key={slide.title}
            className={cn("hero-slide", `hero-slide--${slide.visual}`)}
            data-active={isActive}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} / ${slideCount}`}
            aria-hidden={!isActive}
          >
            <Container className="relative z-10 grid min-h-[680px] items-center gap-10 py-20 sm:min-h-[720px] sm:py-24 lg:grid-cols-[minmax(0,0.88fr)_minmax(480px,1.12fr)] lg:gap-14">
              <div data-hero-copy className="max-w-[620px]">
                <p className="text-sm font-semibold text-sky-700 sm:text-base">
                  {slide.eyebrow}
                </p>
                <Heading className="mt-5 text-balance text-4xl font-semibold leading-[1.14] tracking-normal text-slate-950 sm:text-5xl lg:text-[3.35rem]">
                  <FormattedHeroTitle title={slide.title} />
                </Heading>
                <p className="mt-6 max-w-[540px] text-base leading-8 text-slate-600 sm:text-lg sm:leading-9">
                  {slide.description}
                </p>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Link
                    href={slide.primaryAction.href}
                    tabIndex={isActive ? undefined : -1}
                    className={cn(
                      buttonVariants({ variant: "primary", size: "lg" }),
                      "w-full rounded-full bg-blue-600 px-7 shadow-[0_18px_36px_rgba(37,99,235,0.22)] hover:bg-blue-700 sm:w-auto"
                    )}
                  >
                    {slide.primaryAction.label}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href={slide.secondaryAction.href}
                    tabIndex={isActive ? undefined : -1}
                    className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-slate-800 outline-none transition-colors hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-4 sm:justify-start"
                  >
                    {slide.secondaryAction.label}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
              <div data-hero-visual-stage className="hero-visual-stage">
                <SlideVisual slide={slide} />
              </div>
            </Container>
          </article>
        );
      })}

      <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center sm:bottom-5">
        <p
          className="sr-only"
          aria-live="off"
          aria-atomic="true"
          data-carousel-status="automatic"
        >
          当前为第 {activeIndex + 1} 屏，共 {slideCount} 屏
        </p>
        <p
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
          data-carousel-status="manual"
        >
          {manualAnnouncement}
        </p>
        <div
          className="flex items-center gap-1"
          role="group"
          aria-label="轮播分页"
        >
          {heroSlides.map((slide, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                key={slide.title}
                type="button"
                className="hero-carousel-dot"
                aria-label={`切换到第${index + 1}屏`}
                aria-current={isActive || undefined}
                onClick={() => showSlide(index)}
              >
                <span aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
