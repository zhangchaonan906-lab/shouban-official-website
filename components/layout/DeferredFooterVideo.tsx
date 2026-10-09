"use client";

import { useEffect, useRef } from "react";

type DeferredFooterVideoProps = {
  src: string;
  poster: string;
  className: string;
};

export function DeferredFooterVideo({
  src,
  poster,
  className
}: DeferredFooterVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let isNearViewport = false;
    const motionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    const startPlayback = () => {
      if (cancelled || !isNearViewport || motionQuery.matches) return;

      if (video.dataset.sourceLoaded !== "true") {
        video.dataset.sourceLoaded = "true";
        video.poster = poster;
        video.src = src;
        video.load();
      }
      void video.play().catch(() => {});
    };

    const updateViewportState = (isIntersecting: boolean) => {
      isNearViewport = isIntersecting;
      if (isIntersecting) startPlayback();
      else video.pause();
    };

    const onMotionPreferenceChange = (event: MediaQueryListEvent) => {
      if (event.matches) video.pause();
      else startPlayback();
    };

    motionQuery.addEventListener("change", onMotionPreferenceChange);

    let observer: IntersectionObserver | null = null;
    const onViewportFallback = () => {
      const bounds = video.getBoundingClientRect();
      updateViewportState(
        bounds.bottom >= -400 && bounds.top <= window.innerHeight + 400
      );
    };

    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries.find((item) => item.target === video);
          if (entry) updateViewportState(entry.isIntersecting);
        },
        { rootMargin: "400px 0px" }
      );
      observer.observe(video);
    } else {
      window.addEventListener("scroll", onViewportFallback, { passive: true });
      window.addEventListener("resize", onViewportFallback, { passive: true });
      onViewportFallback();
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
      motionQuery.removeEventListener("change", onMotionPreferenceChange);
      window.removeEventListener("scroll", onViewportFallback);
      window.removeEventListener("resize", onViewportFallback);
    };
  }, [poster, src]);

  return (
    <video
      ref={videoRef}
      className={className}
      muted
      loop
      playsInline
      preload="none"
      data-src={src}
      data-poster={poster}
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}
