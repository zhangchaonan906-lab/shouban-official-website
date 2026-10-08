"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent
} from "react";
import surfaceStyles from "@/components/common/FluentSurface.module.css";
import type { ParentCompanyQualification } from "@/content/qualifications";
import styles from "./QualificationCarousel.module.css";

type ImageBackedQualification = ParentCompanyQualification & {
  readonly image: NonNullable<ParentCompanyQualification["image"]>;
};

type QualificationCarouselProps = {
  readonly qualifications: readonly ParentCompanyQualification[];
};

const AUTOPLAY_DELAY = 2800;
const DRAG_THRESHOLD = 45;
const CLICK_SUPPRESSION_THRESHOLD = 8;
const MAX_DRAG_OFFSET = 120;

function hasImage(
  qualification: ParentCompanyQualification
): qualification is ImageBackedQualification {
  return qualification.image !== undefined;
}

function getSlot(index: number, activeIndex: number, total: number) {
  let offset = (index - activeIndex + total) % total;

  if (offset > total / 2) {
    offset -= total;
  }

  if (offset === 0) return "center";
  if (offset === -1) return "left";
  if (offset === 1) return "right";
  if (offset < -1) return "far-left";
  return "far-right";
}

export function QualificationCarousel({
  qualifications
}: QualificationCarouselProps) {
  const imageQualifications = useMemo(
    () => qualifications.filter(hasImage),
    [qualifications]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef<number | null>(null);
  const latestDragOffsetRef = useRef(0);
  const ignoreClickRef = useRef(false);

  const move = useCallback(
    (direction: number) => {
      setActiveIndex(
        (current) =>
          (current + direction + imageQualifications.length) %
          imageQualifications.length
      );
    },
    [imageQualifications.length]
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (
      reducedMotion ||
      isPaused ||
      isDragging ||
      imageQualifications.length < 2
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        move(1);
      }
    }, AUTOPLAY_DELAY);

    return () => window.clearInterval(timer);
  }, [imageQualifications.length, isDragging, isPaused, move, reducedMotion]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      move(1);
    }
  };

  const resetDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      typeof event.currentTarget.hasPointerCapture === "function" &&
      typeof event.currentTarget.releasePointerCapture === "function" &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragStartXRef.current = null;
    latestDragOffsetRef.current = 0;
    setDragOffset(0);
    setIsDragging(false);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) {
      return;
    }

    dragStartXRef.current = event.clientX;
    latestDragOffsetRef.current = 0;
    ignoreClickRef.current = false;
    setDragOffset(0);
    setIsDragging(true);

    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartXRef.current === null || !event.isPrimary) {
      return;
    }

    const rawOffset = event.clientX - dragStartXRef.current;
    const nextOffset = Math.max(
      -MAX_DRAG_OFFSET,
      Math.min(MAX_DRAG_OFFSET, rawOffset)
    );

    latestDragOffsetRef.current = rawOffset;
    ignoreClickRef.current =
      Math.abs(rawOffset) > CLICK_SUPPRESSION_THRESHOLD;
    setDragOffset(nextOffset);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartXRef.current === null) {
      return;
    }

    const rawOffset = Number.isFinite(event.clientX)
      ? event.clientX - dragStartXRef.current
      : latestDragOffsetRef.current;

    if (rawOffset <= -DRAG_THRESHOLD) {
      move(1);
    } else if (rawOffset >= DRAG_THRESHOLD) {
      move(-1);
    }

    resetDrag(event);
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    ignoreClickRef.current = true;
    resetDrag(event);
  };

  if (imageQualifications.length === 0) {
    return null;
  }

  return (
    <div
      className={`${styles.carousel} ${surfaceStyles.elevated}`}
      role="region"
      aria-label="母公司资质证照展示"
      data-fluent-surface="elevated"
      data-qualification-carousel="true"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsPaused(false);
        }
      }}
    >
      <div
        className={styles.stage}
        aria-live="off"
        data-qualification-track="true"
        data-dragging={isDragging ? "true" : "false"}
        style={{ "--drag-offset": `${dragOffset}px` } as CSSProperties}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {imageQualifications.map((qualification, index) => {
          const isActive = index === activeIndex;
          const slot = getSlot(index, activeIndex, imageQualifications.length);

          return (
            <button
              key={qualification.reference}
              type="button"
              className={styles.card}
              aria-label={`查看 ${qualification.title} 证照`}
              aria-pressed={isActive}
              data-qualification-card="true"
              data-qualification-active={isActive ? "true" : "false"}
              data-slot={slot}
              tabIndex={isActive ? 0 : -1}
              onClick={(event) => {
                if (ignoreClickRef.current) {
                  event.preventDefault();
                  ignoreClickRef.current = false;
                  return;
                }

                setActiveIndex(index);
              }}
            >
              <span className={styles.paper}>
                <Image
                  src={qualification.image.src}
                  alt={qualification.image.alt}
                  width={qualification.image.width}
                  height={qualification.image.height}
                  sizes="(max-width: 640px) 64vw, (max-width: 1024px) 28vw, 286px"
                  className={styles.certificateImage}
                  draggable={false}
                />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
