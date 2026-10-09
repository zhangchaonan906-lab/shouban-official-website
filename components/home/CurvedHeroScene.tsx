"use client";

import { useEffect, useRef, useState } from "react";
import type { CurvedHeroCard } from "@/content/home";
import type { CurvedHeroSceneController } from "@/lib/curved-hero-scene";
import {
  applyFriction,
  dampRotation,
  rotationFromPixels
} from "@/lib/curved-hero";
import styles from "./CurvedHero.module.css";

type CurvedHeroSceneProps = {
  cards: readonly CurvedHeroCard[];
};

const POINTER_VELOCITY_MAX_AGE_MS = 100;

export function CurvedHeroScene({ cards }: CurvedHeroSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRequestedRef = useRef(false);
  const autoRotationPausedRef = useRef(false);
  const startSceneRef = useRef<(() => void) | null>(null);
  const toggleAutoRotationRef = useRef<(() => void) | null>(null);
  const [sceneStatus, setSceneStatus] = useState<"idle" | "loading" | "ready">(
    "idle"
  );
  const [autoRotationPaused, setAutoRotationPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const currentCanvas = canvasRef.current;
    if (currentCanvas === null) return;
    const canvas: HTMLCanvasElement = currentCanvas;

    let cancelled = false;
    let mounting = false;
    let remountAfterRestore = false;
    let contextLost = false;
    let frameId: number | null = null;
    let controller: CurvedHeroSceneController | null = null;
    let intersecting = true;
    let currentRotation = 0;
    let targetRotation = 0;
    let velocity = 0;
    let pointerParallaxX = 0;
    let lastFrameAt = performance.now();
    let lastInputAt = lastFrameAt - 1501;
    let activePointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastPointerAt = lastFrameAt;
    let horizontalDrag = false;
    let pointerBoundsLeft = 0;
    let pointerBoundsWidth = 1;

    const motionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    setReducedMotion(motionQuery.matches);
    const autoRadiansPerSecond = (Math.PI / 4) * 0.11;
    const activeInputOptions: AddEventListenerOptions = { passive: false };
    const passiveOptions: AddEventListenerOptions = { passive: true };

    function canAnimate() {
      return (
        !cancelled &&
        !contextLost &&
        controller !== null &&
        intersecting &&
        !document.hidden &&
        !motionQuery.matches
      );
    }

    function shouldContinueAnimation() {
      return (
        canAnimate() &&
        (!autoRotationPausedRef.current ||
          horizontalDrag ||
          velocity !== 0 ||
          Math.abs(targetRotation - currentRotation) > 0.0005)
      );
    }

    function stopFrame() {
      if (frameId === null) return;
      window.cancelAnimationFrame(frameId);
      frameId = null;
    }

    function requestNextFrame(resetClock: boolean) {
      if (!shouldContinueAnimation() || frameId !== null) return;
      if (resetClock) lastFrameAt = performance.now();
      frameId = window.requestAnimationFrame(tick);
    }

    function tick(now: number) {
      const activeController = controller;
      if (!shouldContinueAnimation() || activeController === null) {
        stopFrame();
        return;
      }

      try {
        const deltaSeconds = Math.min(
          Math.max((now - lastFrameAt) / 1000, 0),
          0.05
        );
        lastFrameAt = now;

        if (activePointerId === null) {
          if (
            !autoRotationPausedRef.current &&
            now - lastInputAt > 1500
          ) {
            targetRotation -= autoRadiansPerSecond * deltaSeconds;
          }
          targetRotation += velocity * deltaSeconds;
          velocity = applyFriction(
            velocity,
            Math.pow(0.94, deltaSeconds * 60)
          );
          if (Math.abs(velocity) < 0.0005) velocity = 0;
        }
        const damping = 1 - Math.pow(1 - 0.08, deltaSeconds * 60);
        currentRotation = dampRotation(
          currentRotation,
          targetRotation,
          damping
        );
        activeController.render(currentRotation, pointerParallaxX);
        frameId = null;
        requestNextFrame(false);
      } catch {
        handleSceneFailure();
      }
    }

    function resizeScene() {
      if (window.innerWidth < 768) pointerParallaxX = 0;

      const activeController = controller;
      if (activeController === null) {
        if (window.innerWidth >= 768 && !motionQuery.matches) {
          startScene();
        }
        return;
      }

      try {
        const bounds = canvas.getBoundingClientRect();
        pointerBoundsLeft = bounds.left;
        pointerBoundsWidth = Math.max(bounds.width, 1);
        activeController.resize(
          Math.max(bounds.width, canvas.clientWidth, 1),
          Math.max(bounds.height, canvas.clientHeight, 1),
          window.devicePixelRatio || 1
        );
      } catch {
        handleSceneFailure();
      }
    }

    function safeDisposeController() {
      const controllerToDispose = controller;
      controller = null;
      if (controllerToDispose === null) return;

      try {
        controllerToDispose.dispose();
      } catch {
        // Disposal is best-effort so diagnostics never break React cleanup.
      }
    }

    function resetCarouselState() {
      currentRotation = 0;
      targetRotation = 0;
      velocity = 0;
      pointerParallaxX = 0;
    }

    function handleSceneFailure() {
      stopFrame();
      resetCarouselState();
      canvas.removeAttribute("data-ready");
      safeDisposeController();
      autoRotationPausedRef.current = false;
      setAutoRotationPaused(false);
      setSceneStatus("idle");
    }

    async function mount() {
      if (
        cancelled ||
        mounting ||
        motionQuery.matches ||
        controller !== null ||
        contextLost
      ) {
        return;
      }

      mounting = true;
      let mountingController: CurvedHeroSceneController | null = null;
      try {
        const { createCurvedHeroScene } = await import(
          "@/lib/curved-hero-scene"
        );
        if (cancelled || motionQuery.matches || contextLost) return;

        mountingController = createCurvedHeroScene({ canvas, cards });
        controller = mountingController;
        resizeScene();
        await mountingController.ready;
        if (
          cancelled ||
          contextLost ||
          motionQuery.matches ||
          controller !== mountingController
        ) {
          return;
        }
        mountingController.render(currentRotation, pointerParallaxX);
        canvas.dataset.ready = "true";
        setSceneStatus("ready");
        requestNextFrame(true);
      } catch {
        if (mountingController === null || controller === mountingController) {
          handleSceneFailure();
        }
      } finally {
        mounting = false;
        if (remountAfterRestore) {
          remountAfterRestore = false;
          startScene();
        }
      }
    }

    function startScene() {
      if (
        cancelled ||
        motionQuery.matches ||
        controller !== null ||
        mounting
      ) {
        return;
      }

      sceneRequestedRef.current = true;
      setSceneStatus("loading");
      void mount();
    }

    function toggleAutoRotation() {
      const activeController = controller;
      if (activeController === null) return;

      const nextPaused = !autoRotationPausedRef.current;
      autoRotationPausedRef.current = nextPaused;
      setAutoRotationPaused(nextPaused);

      if (nextPaused) {
        velocity = 0;
        targetRotation = currentRotation;
        pointerParallaxX = 0;
        try {
          activeController.render(currentRotation, pointerParallaxX);
        } catch {
          handleSceneFailure();
          return;
        }
        stopFrame();
      } else {
        requestNextFrame(true);
      }
    }

    function markInput(now = performance.now()) {
      lastInputAt = now;
    }

    function updatePointerBounds() {
      const bounds = canvas.getBoundingClientRect();
      pointerBoundsLeft = bounds.left;
      pointerBoundsWidth = Math.max(bounds.width, 1);
    }

    function resetPointer() {
      activePointerId = null;
      startX = 0;
      startY = 0;
      lastX = 0;
      lastPointerAt = 0;
      horizontalDrag = false;
    }

    function finishPointerInteraction() {
      if (activePointerId === null) return;

      const now = performance.now();
      if (now - lastPointerAt > POINTER_VELOCITY_MAX_AGE_MS) {
        velocity = 0;
      }
      markInput(now);
      resetPointer();
      requestNextFrame(true);
    }

    function onPointerDown(event: PointerEvent) {
      if (event.button !== 0 || activePointerId !== null) return;

      updatePointerBounds();
      velocity = 0;
      activePointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      lastX = event.clientX;
      lastPointerAt = performance.now();
      horizontalDrag = false;

      try {
        canvas.setPointerCapture?.(event.pointerId);
      } catch {
        resetPointer();
      }
    }

    function onPointerEnter() {
      updatePointerBounds();
    }

    function onPointerMove(event: PointerEvent) {
      if (window.innerWidth >= 768) {
        const normalizedX =
          ((event.clientX - pointerBoundsLeft) / pointerBoundsWidth) * 2 - 1;
        pointerParallaxX = Math.max(-1, Math.min(1, normalizedX));
      } else {
        pointerParallaxX = 0;
      }

      if (autoRotationPausedRef.current && activePointerId === null) {
        try {
          controller?.render(currentRotation, pointerParallaxX);
        } catch {
          handleSceneFailure();
        }
      }

      if (event.pointerId !== activePointerId) return;

      const totalX = event.clientX - startX;
      const totalY = event.clientY - startY;
      if (!horizontalDrag) {
        horizontalDrag =
          Math.abs(totalX) > 8 && Math.abs(totalX) > Math.abs(totalY);
      }
      if (!horizontalDrag) return;

      event.preventDefault();
      const deltaX = event.clientX - lastX;
      const deltaRotation = rotationFromPixels(deltaX);
      const now = performance.now();
      const elapsedSeconds = Math.max(
        (now - lastPointerAt) / 1000,
        1 / 120
      );
      targetRotation += deltaRotation;
      velocity = (deltaRotation / elapsedSeconds) * 0.12;
      lastX = event.clientX;
      lastPointerAt = now;
      markInput(now);
      if (autoRotationPausedRef.current) requestNextFrame(true);
    }

    function finishPointer(event: PointerEvent) {
      if (event.pointerId !== activePointerId) return;

      try {
        if (canvas.hasPointerCapture?.(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }
      } catch {
        // The browser may release capture before pointerup/pointercancel runs.
      }

      finishPointerInteraction();
    }

    function onLostPointerCapture(event: PointerEvent) {
      if (event.pointerId === activePointerId) finishPointerInteraction();
    }

    function onPointerLeave() {
      if (activePointerId !== null) {
        let hasCapture = false;
        try {
          hasCapture = canvas.hasPointerCapture?.(activePointerId) ?? false;
        } catch {
          hasCapture = false;
        }
        if (!hasCapture) finishPointerInteraction();
      }
      if (activePointerId === null) {
        pointerParallaxX = 0;
        if (autoRotationPausedRef.current) {
          try {
            controller?.render(currentRotation, 0);
          } catch {
            handleSceneFailure();
          }
        }
      }
    }

    function onWheel(event: WheelEvent) {
      const horizontalDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      if (!horizontalDelta && !event.shiftKey) return;

      event.preventDefault();
      const rawDelta = horizontalDelta ? event.deltaX : event.deltaY;
      const pixelDelta =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? rawDelta * 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? rawDelta * Math.max(window.innerHeight, 1)
            : rawDelta;
      const delta = Math.max(-80, Math.min(80, pixelDelta));
      const deltaRotation = rotationFromPixels(-delta * 0.55);
      targetRotation += deltaRotation;
      velocity = deltaRotation * 3.5;
      markInput();
      if (autoRotationPausedRef.current) requestNextFrame(true);
    }

    function onVisibilityChange() {
      if (document.hidden) stopFrame();
      else requestNextFrame(true);
    }

    function onContextLost(event: Event) {
      event.preventDefault();
      contextLost = true;
      handleSceneFailure();
    }

    function onContextRestored() {
      if (cancelled) return;
      contextLost = false;
      if (motionQuery.matches) return;
      if (mounting) remountAfterRestore = true;
      else startScene();
    }

    function onMotionPreferenceChange(event: MediaQueryListEvent) {
      setReducedMotion(event.matches);
      if (event.matches) {
        handleSceneFailure();
      } else if (window.innerWidth >= 768 || sceneRequestedRef.current) {
        startScene();
      }
    }

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => resizeScene());
    resizeObserver?.observe(canvas);

    const intersectionObserver =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entries) => {
              intersecting = entries[0]?.isIntersecting ?? true;
              if (intersecting) requestNextFrame(true);
              else stopFrame();
            },
            { threshold: 0.05 }
          );
    intersectionObserver?.observe(canvas);

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerenter", onPointerEnter);
    canvas.addEventListener("pointermove", onPointerMove, activeInputOptions);
    canvas.addEventListener("pointerup", finishPointer);
    canvas.addEventListener("pointercancel", finishPointer);
    canvas.addEventListener("lostpointercapture", onLostPointerCapture);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("wheel", onWheel, activeInputOptions);
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    window.addEventListener("resize", resizeScene, passiveOptions);
    document.addEventListener("visibilitychange", onVisibilityChange);
    motionQuery.addEventListener("change", onMotionPreferenceChange);

    startSceneRef.current = startScene;
    toggleAutoRotationRef.current = toggleAutoRotation;
    if (window.innerWidth >= 768 && !motionQuery.matches) {
      startScene();
    }

    return () => {
      cancelled = true;
      remountAfterRestore = false;
      startSceneRef.current = null;
      toggleAutoRotationRef.current = null;
      sceneRequestedRef.current = false;
      autoRotationPausedRef.current = false;
      stopFrame();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerenter", onPointerEnter);
      canvas.removeEventListener(
        "pointermove",
        onPointerMove,
        activeInputOptions
      );
      canvas.removeEventListener("pointerup", finishPointer);
      canvas.removeEventListener("pointercancel", finishPointer);
      canvas.removeEventListener("lostpointercapture", onLostPointerCapture);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("wheel", onWheel, activeInputOptions);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      window.removeEventListener("resize", resizeScene, passiveOptions);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      motionQuery.removeEventListener("change", onMotionPreferenceChange);
      resetPointer();
      safeDisposeController();
    };
  }, [cards]);

  const motionControlLabel = reducedMotion
    ? "主视觉动画已按系统设置停用"
    : sceneStatus === "loading"
      ? "正在启动 3D 展示"
      : sceneStatus === "ready"
        ? autoRotationPaused
          ? "恢复主视觉自动旋转"
          : "暂停主视觉自动旋转"
        : "启动 3D 展示";

  return (
    <>
      <button
        type="button"
        className={styles.motionControl}
        data-curved-hero-motion-control
        aria-label={motionControlLabel}
        disabled={reducedMotion || sceneStatus === "loading"}
        onClick={() => {
          if (sceneStatus === "idle") startSceneRef.current?.();
          else if (sceneStatus === "ready") toggleAutoRotationRef.current?.();
        }}
      >
        {motionControlLabel}
      </button>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
    </>
  );
}
