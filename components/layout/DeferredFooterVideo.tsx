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
    if (!video || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let cancelled = false;
    const startPlayback = () => {
      if (cancelled || video.dataset.sourceLoaded === "true") return;

      video.dataset.sourceLoaded = "true";
      video.poster = poster;
      video.src = src;
      video.load();
      void video.play().catch(() => {});
    };

    if (typeof IntersectionObserver === "undefined") {
      startPlayback();
      return () => {
        cancelled = true;
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          startPlayback();
        }
      },
      { rootMargin: "400px 0px" }
    );
    observer.observe(video);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [poster, src]);

  return (
    <video
      ref={videoRef}
      className={className}
      autoPlay
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
