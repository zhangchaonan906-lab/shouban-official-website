// @vitest-environment jsdom

import userEvent from "@testing-library/user-event";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sceneSpies = vi.hoisted(() => {
  const renderScene = vi.fn();
  const resizeScene = vi.fn();
  const disposeScene = vi.fn();

  return {
    createScene: vi.fn(),
    readyScene: Promise.resolve(),
    renderScene,
    resizeScene,
    disposeScene
  };
});

vi.mock("@/lib/curved-hero-scene", () => ({
  createCurvedHeroScene: sceneSpies.createScene
}));

import { CurvedHeroScene } from "@/components/home/CurvedHeroScene";
import { curvedHeroCards } from "@/content/home";

type SceneTestEnvironment = {
  cancelFrame: ReturnType<typeof vi.fn>;
  emitIntersection: (isIntersecting: boolean) => void;
  emitResize: () => void;
  intersectionDisconnect: ReturnType<typeof vi.fn>;
  mediaAddEventListener: ReturnType<typeof vi.fn>;
  mediaRemoveEventListener: ReturnType<typeof vi.fn>;
  pendingFrames: Map<number, FrameRequestCallback>;
  requestFrame: ReturnType<typeof vi.fn>;
  resizeDisconnect: ReturnType<typeof vi.fn>;
  runFrame: (frameId: number, now: number) => void;
  runNextFrame: (now: number) => void;
  setDocumentHidden: (hidden: boolean) => void;
  setNow: (now: number) => void;
  setReducedMotion: (reduced: boolean) => void;
  setViewportWidth: (width: number) => void;
};

let environment: SceneTestEnvironment;

function installSceneEnvironment(): SceneTestEnvironment {
  let reducedMotion = false;
  let documentHidden = false;
  let currentTime = 0;
  let nextFrameId = 0;
  let intersectionCallback: IntersectionObserverCallback | null = null;
  let intersectionObserver: IntersectionObserver | null = null;
  let resizeCallback: ResizeObserverCallback | null = null;
  let resizeObserver: ResizeObserver | null = null;
  const mediaListeners = new Set<(event: MediaQueryListEvent) => void>();
  const pendingFrames = new Map<number, FrameRequestCallback>();
  const resizeDisconnect = vi.fn();
  const intersectionDisconnect = vi.fn();

  vi.spyOn(performance, "now").mockImplementation(() => currentTime);

  const requestFrame = vi.fn((callback: FrameRequestCallback) => {
    const frameId = ++nextFrameId;
    pendingFrames.set(frameId, callback);
    return frameId;
  });
  const cancelFrame = vi.fn((frameId: number) => {
    pendingFrames.delete(frameId);
  });

  const mediaAddEventListener = vi.fn(
    (
      eventName: string,
      listener: EventListenerOrEventListenerObject
    ) => {
      if (eventName === "change" && typeof listener === "function") {
        mediaListeners.add(listener as (event: MediaQueryListEvent) => void);
      }
    }
  );
  const mediaRemoveEventListener = vi.fn(
    (
      eventName: string,
      listener: EventListenerOrEventListenerObject
    ) => {
      if (eventName === "change" && typeof listener === "function") {
        mediaListeners.delete(listener as (event: MediaQueryListEvent) => void);
      }
    }
  );

  const mediaQueryList = {
    get matches() {
      return reducedMotion;
    },
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: mediaAddEventListener,
    removeEventListener: mediaRemoveEventListener,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  } as unknown as MediaQueryList;

  class MockResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = resizeDisconnect;

    constructor(callback: ResizeObserverCallback) {
      resizeCallback = callback;
      resizeObserver = this as unknown as ResizeObserver;
    }
  }

  class MockIntersectionObserver {
    readonly root = null;
    readonly rootMargin = "0px";
    readonly thresholds = [0.05];
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = intersectionDisconnect;
    takeRecords = vi.fn(() => [] as IntersectionObserverEntry[]);

    constructor(callback: IntersectionObserverCallback) {
      intersectionCallback = callback;
      intersectionObserver = this as unknown as IntersectionObserver;
    }
  }

  vi.stubGlobal("matchMedia", vi.fn(() => mediaQueryList));
  vi.stubGlobal("requestAnimationFrame", requestFrame);
  vi.stubGlobal("cancelAnimationFrame", cancelFrame);
  vi.stubGlobal("ResizeObserver", MockResizeObserver);
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => documentHidden
  });
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 1024,
    writable: true
  });

  function runFrame(frameId: number, now: number) {
    const callback = pendingFrames.get(frameId);
    if (callback === undefined) {
      throw new Error(`Animation frame ${frameId} is not pending.`);
    }
    currentTime = now;
    pendingFrames.delete(frameId);
    callback(now);
  }

  return {
    cancelFrame,
    intersectionDisconnect,
    mediaAddEventListener,
    mediaRemoveEventListener,
    pendingFrames,
    requestFrame,
    resizeDisconnect,
    runFrame,
    runNextFrame(now) {
      const frameId = pendingFrames.keys().next().value;
      if (typeof frameId !== "number") {
        throw new Error("No animation frame is pending.");
      }
      runFrame(frameId, now);
    },
    setDocumentHidden(hidden) {
      documentHidden = hidden;
    },
    setNow(now) {
      currentTime = now;
    },
    setReducedMotion(reduced) {
      reducedMotion = reduced;
      const event = {
        matches: reducedMotion,
        media: mediaQueryList.media
      } as MediaQueryListEvent;
      mediaListeners.forEach((listener) => listener(event));
    },
    setViewportWidth(width) {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: width,
        writable: true
      });
    },
    emitResize() {
      if (resizeCallback === null || resizeObserver === null) {
        throw new Error("ResizeObserver was not installed.");
      }
      resizeCallback([], resizeObserver);
    },
    emitIntersection(isIntersecting) {
      if (intersectionCallback === null || intersectionObserver === null) {
        throw new Error("IntersectionObserver was not installed.");
      }
      intersectionCallback(
        [{ isIntersecting } as IntersectionObserverEntry],
        intersectionObserver
      );
    }
  };
}

function createPointerEvent(
  type: string,
  {
    pointerId,
    clientX,
    clientY,
    button = 0,
    pointerType = "mouse"
  }: {
    pointerId: number;
    clientX: number;
    clientY: number;
    button?: number;
    pointerType?: string;
  }
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    clientX: { value: clientX },
    clientY: { value: clientY },
    button: { value: button },
    pointerType: { value: pointerType },
    isPrimary: { value: true }
  });
  return event as PointerEvent;
}

function getCanvas(container: HTMLElement) {
  const canvas = container.querySelector("canvas");
  expect(canvas).toBeInstanceOf(HTMLCanvasElement);
  return canvas as HTMLCanvasElement;
}

async function renderReadyScene() {
  const result = render(<CurvedHeroScene cards={curvedHeroCards} />);
  const canvas = getCanvas(result.container);
  const setPointerCapture = vi.fn();
  const hasPointerCapture = vi.fn(() => true);
  const releasePointerCapture = vi.fn();
  Object.defineProperties(canvas, {
    setPointerCapture: { configurable: true, value: setPointerCapture },
    hasPointerCapture: {
      configurable: true,
      value: hasPointerCapture
    },
    releasePointerCapture: {
      configurable: true,
      value: releasePointerCapture
    }
  });

  await waitFor(() => {
    expect(sceneSpies.createScene).toHaveBeenCalledTimes(1);
    expect(canvas.getAttribute("data-ready")).toBe("true");
  });

  return {
    ...result,
    canvas,
    hasPointerCapture,
    releasePointerCapture,
    setPointerCapture
  };
}

function getLastRenderRotation() {
  const lastCall = sceneSpies.renderScene.mock.calls.at(-1);
  if (lastCall === undefined || typeof lastCall[0] !== "number") {
    throw new Error("Expected the scene to have rendered a rotation.");
  }
  return lastCall[0];
}

function createBounds(left: number, width: number): DOMRect {
  return {
    x: left,
    y: 0,
    left,
    right: left + width,
    top: 0,
    bottom: 400,
    width,
    height: 400,
    toJSON: () => ({})
  };
}

beforeEach(() => {
  sceneSpies.createScene.mockReset();
  sceneSpies.renderScene.mockReset();
  sceneSpies.resizeScene.mockReset();
  sceneSpies.disposeScene.mockReset();
  sceneSpies.readyScene = Promise.resolve();
  sceneSpies.createScene.mockImplementation(() => ({
    ready: sceneSpies.readyScene,
    render: sceneSpies.renderScene,
    resize: sceneSpies.resizeScene,
    dispose: sceneSpies.disposeScene
  }));
  environment = installSceneEnvironment();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, "hidden");
});

describe("CurvedHeroScene", () => {
  it("waits for keyboard activation on mobile before loading the 3D scene", async () => {
    environment.setViewportWidth(390);
    const user = userEvent.setup();
    const { container } = render(
      <CurvedHeroScene cards={curvedHeroCards} />
    );
    const startButton = screen.getByRole("button", { name: "启动 3D 展示" });

    expect(getCanvas(container).hasAttribute("data-ready")).toBe(false);
    expect(sceneSpies.createScene).not.toHaveBeenCalled();

    await user.tab();
    expect(document.activeElement).toBe(startButton);
    await user.keyboard("{Enter}");

    const pauseButton = await screen.findByRole("button", {
      name: "暂停主视觉自动旋转"
    });
    expect(sceneSpies.createScene).toHaveBeenCalledOnce();
    expect(pauseButton.textContent).toBe("暂停主视觉自动旋转");

    await user.keyboard("{Enter}");
    const resumeButton = screen.getByRole("button", {
      name: "恢复主视觉自动旋转"
    });
    expect(resumeButton.textContent).toBe("恢复主视觉自动旋转");

    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("button", { name: "暂停主视觉自动旋转" })
    ).toBe(pauseButton);
  });

  it("stops the animation frame loop when paused and restarts it when resumed", async () => {
    const user = userEvent.setup();
    await renderReadyScene();

    await user.click(
      screen.getByRole("button", { name: "暂停主视觉自动旋转" })
    );

    expect(environment.pendingFrames.size).toBe(0);
    expect(environment.cancelFrame).toHaveBeenCalledWith(1);

    await user.click(
      screen.getByRole("button", { name: "恢复主视觉自动旋转" })
    );

    expect(environment.pendingFrames.size).toBe(1);
    expect(environment.requestFrame).toHaveBeenCalledTimes(2);
  });

  it("renders only the visual canvas without an image explanation", async () => {
    const { canvas, container } = await renderReadyScene();

    expect(canvas.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelectorAll("canvas")).toHaveLength(1);
    expect(
      container.querySelector("[data-curved-hero-active-label]")
    ).toBeNull();
  });

  it("mounts one scene, renders it, and releases its current frame and resources", async () => {
    const { canvas, unmount } = await renderReadyScene();
    const removeCanvasListener = vi.spyOn(canvas, "removeEventListener");

    expect(sceneSpies.createScene).toHaveBeenCalledWith({
      canvas,
      cards: curvedHeroCards
    });
    expect(sceneSpies.resizeScene).toHaveBeenCalledTimes(1);
    expect(sceneSpies.renderScene).toHaveBeenCalledTimes(1);
    expect(canvas.getAttribute("aria-hidden")).toBe("true");
    expect(environment.requestFrame).toHaveBeenCalledTimes(1);
    expect(environment.pendingFrames.size).toBe(1);

    unmount();

    expect(environment.cancelFrame).toHaveBeenCalledWith(1);
    expect(environment.pendingFrames.size).toBe(0);
    expect(sceneSpies.disposeScene).toHaveBeenCalledTimes(1);
    expect(environment.resizeDisconnect).toHaveBeenCalledTimes(1);
    expect(environment.intersectionDisconnect).toHaveBeenCalledTimes(1);
    expect(environment.mediaRemoveEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    );
    expect(removeCanvasListener).toHaveBeenCalledWith(
      "lostpointercapture",
      expect.any(Function)
    );
    expect(removeCanvasListener).toHaveBeenCalledWith(
      "pointerenter",
      expect.any(Function)
    );

    const lifecycleCalls = {
      cancel: environment.cancelFrame.mock.calls.length,
      create: sceneSpies.createScene.mock.calls.length,
      dispose: sceneSpies.disposeScene.mock.calls.length,
      render: sceneSpies.renderScene.mock.calls.length,
      request: environment.requestFrame.mock.calls.length,
      resize: sceneSpies.resizeScene.mock.calls.length
    };
    const lostEvent = new Event("webglcontextlost", { cancelable: true });

    act(() => {
      canvas.dispatchEvent(
        createPointerEvent("pointerdown", {
          pointerId: 99,
          clientX: 0,
          clientY: 0
        })
      );
      canvas.dispatchEvent(lostEvent);
      canvas.dispatchEvent(new Event("webglcontextrestored"));
      window.dispatchEvent(new Event("resize"));
      document.dispatchEvent(new Event("visibilitychange"));
      environment.setReducedMotion(true);
      environment.setReducedMotion(false);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(lostEvent.defaultPrevented).toBe(false);
    expect(canvas.getAttribute("data-ready")).toBe("true");
    expect({
      cancel: environment.cancelFrame.mock.calls.length,
      create: sceneSpies.createScene.mock.calls.length,
      dispose: sceneSpies.disposeScene.mock.calls.length,
      render: sceneSpies.renderScene.mock.calls.length,
      request: environment.requestFrame.mock.calls.length,
      resize: sceneSpies.resizeScene.mock.calls.length
    }).toEqual(lifecycleCalls);
  });

  it("keeps the fallback and skips WebGL and animation for initial reduced motion", async () => {
    environment.setReducedMotion(true);
    const { container } = render(
      <CurvedHeroScene cards={curvedHeroCards} />
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(sceneSpies.createScene).not.toHaveBeenCalled();
    expect(environment.requestFrame).not.toHaveBeenCalled();
    expect(getCanvas(container).hasAttribute("data-ready")).toBe(false);
    expect(
      (
        screen.getByRole("button", {
          name: "主视觉动画已按系统设置停用"
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
  });

  it("keeps the fallback visible until the controller reports its textures ready", async () => {
    let resolveReady!: () => void;
    sceneSpies.readyScene = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });
    const { container } = render(
      <CurvedHeroScene cards={curvedHeroCards} />
    );
    const canvas = getCanvas(container);

    await waitFor(() => {
      expect(sceneSpies.createScene).toHaveBeenCalledTimes(1);
    });
    expect(canvas.hasAttribute("data-ready")).toBe(false);

    resolveReady();
    await waitFor(() => {
      expect(canvas.getAttribute("data-ready")).toBe("true");
    });
  });

  it("keeps the fallback visible and disposes the scene when texture readiness fails", async () => {
    let rejectReady!: (reason?: unknown) => void;
    sceneSpies.readyScene = new Promise<void>((_resolve, reject) => {
      rejectReady = reject;
    });
    void sceneSpies.readyScene.catch(() => undefined);
    const { container } = render(
      <CurvedHeroScene cards={curvedHeroCards} />
    );
    const canvas = getCanvas(container);

    await waitFor(() => {
      expect(sceneSpies.createScene).toHaveBeenCalledTimes(1);
    });
    rejectReady(new Error("texture load failed"));

    await waitFor(() => {
      expect(sceneSpies.disposeScene).toHaveBeenCalledTimes(1);
    });
    expect(canvas.hasAttribute("data-ready")).toBe(false);
    expect(environment.requestFrame).not.toHaveBeenCalled();
  });

  it("does not reveal or animate a scene whose texture readiness finishes after unmount", async () => {
    let resolveReady!: () => void;
    sceneSpies.readyScene = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });
    const { container, unmount } = render(
      <CurvedHeroScene cards={curvedHeroCards} />
    );
    const canvas = getCanvas(container);

    await waitFor(() => {
      expect(sceneSpies.createScene).toHaveBeenCalledTimes(1);
    });
    unmount();
    resolveReady();
    await act(async () => {
      await Promise.resolve();
    });

    expect(canvas.hasAttribute("data-ready")).toBe(false);
    expect(sceneSpies.disposeScene).toHaveBeenCalledTimes(1);
    expect(sceneSpies.renderScene).not.toHaveBeenCalled();
    expect(environment.requestFrame).not.toHaveBeenCalled();
  });

  it("tears down and recreates the scene when reduced motion changes at runtime", async () => {
    const { canvas } = await renderReadyScene();

    act(() => environment.setReducedMotion(true));

    expect(environment.cancelFrame).toHaveBeenCalledWith(1);
    expect(canvas.hasAttribute("data-ready")).toBe(false);
    expect(sceneSpies.disposeScene).toHaveBeenCalledTimes(1);
    expect(environment.pendingFrames.size).toBe(0);

    act(() => environment.setReducedMotion(false));

    await waitFor(() => {
      expect(sceneSpies.createScene).toHaveBeenCalledTimes(2);
      expect(canvas.getAttribute("data-ready")).toBe("true");
    });
    expect(sceneSpies.resizeScene).toHaveBeenCalledTimes(2);
    expect(sceneSpies.renderScene).toHaveBeenCalledTimes(2);
    expect(environment.requestFrame).toHaveBeenCalledTimes(2);
    expect(environment.pendingFrames.has(2)).toBe(true);
  });

  it("disposes a created controller and keeps the fallback when its initial render fails", async () => {
    sceneSpies.renderScene.mockImplementationOnce(() => {
      throw new Error("initial render failed");
    });
    sceneSpies.disposeScene.mockImplementationOnce(() => {
      throw new Error("diagnostic disposal failure");
    });
    const { container } = render(
      <CurvedHeroScene cards={curvedHeroCards} />
    );

    await waitFor(() => {
      expect(sceneSpies.disposeScene).toHaveBeenCalledTimes(1);
    });

    expect(getCanvas(container).hasAttribute("data-ready")).toBe(false);
    expect(environment.requestFrame).not.toHaveBeenCalled();
  });

  it("falls back and stops animation when a later frame render fails", async () => {
    const { canvas } = await renderReadyScene();
    sceneSpies.renderScene.mockImplementationOnce(() => {
      throw new Error("animation render failed");
    });

    expect(() => {
      act(() => environment.runFrame(1, 16));
    }).not.toThrow();

    expect(canvas.hasAttribute("data-ready")).toBe(false);
    expect(environment.cancelFrame).toHaveBeenCalledWith(1);
    expect(environment.pendingFrames.size).toBe(0);
    expect(environment.requestFrame).toHaveBeenCalledTimes(1);
    expect(sceneSpies.disposeScene).toHaveBeenCalledTimes(1);
  });

  it("falls back and cancels animation when a later resize fails", async () => {
    const { canvas } = await renderReadyScene();
    sceneSpies.resizeScene.mockImplementationOnce(() => {
      throw new Error("runtime resize failed");
    });

    expect(() => {
      act(() => environment.emitResize());
    }).not.toThrow();

    expect(canvas.hasAttribute("data-ready")).toBe(false);
    expect(environment.cancelFrame).toHaveBeenCalledWith(1);
    expect(environment.pendingFrames.size).toBe(0);
    expect(environment.requestFrame).toHaveBeenCalledTimes(1);
    expect(sceneSpies.disposeScene).toHaveBeenCalledTimes(1);
  });

  it("pauses outside the viewport and requests a new frame after re-entry", async () => {
    await renderReadyScene();
    expect(environment.pendingFrames.has(1)).toBe(true);

    act(() => environment.emitIntersection(false));

    expect(environment.cancelFrame).toHaveBeenCalledWith(1);
    expect(environment.pendingFrames.size).toBe(0);

    act(() => environment.emitIntersection(true));

    expect(environment.requestFrame).toHaveBeenCalledTimes(2);
    expect(environment.pendingFrames.has(2)).toBe(true);
  });

  it("autoplays right-to-left at approximately 0.11 slots per second", async () => {
    await renderReadyScene();
    const slotStep = Math.PI / 4;
    const autoRadiansPerSecond = slotStep * 0.11;
    const dampingAtFiftyMilliseconds = 1 - Math.pow(1 - 0.08, 3);

    act(() => environment.runNextFrame(50));

    const expectedFirstRotation =
      -autoRadiansPerSecond * 0.05 * dampingAtFiftyMilliseconds;
    expect(getLastRenderRotation()).toBeLessThan(0);
    expect(getLastRenderRotation()).toBeCloseTo(expectedFirstRotation, 10);

    for (let frame = 2; frame <= 80; frame += 1) {
      act(() => environment.runNextFrame(frame * 50));
    }
    const rotationAtFourSeconds = getLastRenderRotation();
    for (let frame = 81; frame <= 100; frame += 1) {
      act(() => environment.runNextFrame(frame * 50));
    }
    const renderedSlotsPerSecond =
      (getLastRenderRotation() - rotationAtFourSeconds) / slotStep;

    expect(renderedSlotsPerSecond).toBeCloseTo(-0.11, 4);
  });

  it("suppresses autoplay for 1500ms after input and resumes afterward", async () => {
    const { canvas } = await renderReadyScene();
    const zeroDeltaInput = new WheelEvent("wheel", {
      cancelable: true,
      deltaY: 0,
      shiftKey: true
    });

    act(() => canvas.dispatchEvent(zeroDeltaInput));
    [500, 1000, 1500].forEach((now) => {
      act(() => environment.runNextFrame(now));
      expect(getLastRenderRotation()).toBe(0);
    });

    act(() => environment.runNextFrame(1550));

    const autoRadiansPerSecond = (Math.PI / 4) * 0.11;
    const dampingAtFiftyMilliseconds = 1 - Math.pow(1 - 0.08, 3);
    expect(getLastRenderRotation()).toBeCloseTo(
      -autoRadiansPerSecond * 0.05 * dampingAtFiftyMilliseconds,
      10
    );
  });

  it("does not autoplay while a pointer remains held", async () => {
    const { canvas } = await renderReadyScene();

    act(() => {
      canvas.dispatchEvent(
        createPointerEvent("pointerdown", {
          pointerId: 21,
          clientX: 100,
          clientY: 100
        })
      );
      environment.runNextFrame(1600);
    });

    expect(getLastRenderRotation()).toBe(0);
  });

  it("does not integrate pointer velocity as inertia before release", async () => {
    const { canvas } = await renderReadyScene();
    environment.setNow(0);
    act(() => {
      canvas.dispatchEvent(
        createPointerEvent("pointerdown", {
          pointerId: 22,
          clientX: 100,
          clientY: 100
        })
      );
    });
    environment.setNow(100);
    act(() => {
      canvas.dispatchEvent(
        createPointerEvent("pointermove", {
          pointerId: 22,
          clientX: 120,
          clientY: 100
        })
      );
      environment.runNextFrame(150);
    });

    const directDragTarget = 20 * 0.006;
    const dampingAtFiftyMilliseconds = 1 - Math.pow(1 - 0.08, 3);
    expect(getLastRenderRotation()).toBeCloseTo(
      directDragTarget * dampingAtFiftyMilliseconds,
      10
    );
  });

  it("starts a fresh 1500ms autoplay pause when the pointer is released", async () => {
    const { canvas } = await renderReadyScene();

    act(() => {
      canvas.dispatchEvent(
        createPointerEvent("pointerdown", {
          pointerId: 23,
          clientX: 100,
          clientY: 100
        })
      );
    });
    environment.setNow(2000);
    act(() => {
      canvas.dispatchEvent(
        createPointerEvent("pointerup", {
          pointerId: 23,
          clientX: 100,
          clientY: 100
        })
      );
      environment.runNextFrame(3500);
    });

    expect(getLastRenderRotation()).toBe(0);

    act(() => environment.runNextFrame(3550));
    expect(getLastRenderRotation()).toBeLessThan(0);
  });

  it("does not resume existing inertia after a pointer press without dragging", async () => {
    const { canvas } = await renderReadyScene();
    const wheel = new WheelEvent("wheel", {
      cancelable: true,
      deltaX: 20
    });

    act(() => {
      canvas.dispatchEvent(wheel);
      environment.runNextFrame(50);
    });

    const deltaRotation = -20 * 0.55 * 0.006;
    const targetAfterFirstFrame =
      deltaRotation + deltaRotation * 3.5 * 0.05;
    const dampingAtFiftyMilliseconds = 1 - Math.pow(1 - 0.08, 3);
    const rotationAfterFirstFrame =
      targetAfterFirstFrame * dampingAtFiftyMilliseconds;

    act(() => {
      canvas.dispatchEvent(
        createPointerEvent("pointerdown", {
          pointerId: 24,
          clientX: 100,
          clientY: 100
        })
      );
    });
    environment.setNow(100);
    act(() => {
      canvas.dispatchEvent(
        createPointerEvent("pointerup", {
          pointerId: 24,
          clientX: 100,
          clientY: 100
        })
      );
      environment.runNextFrame(150);
    });

    const expectedRotation =
      rotationAfterFirstFrame +
      (targetAfterFirstFrame - rotationAfterFirstFrame) *
        dampingAtFiftyMilliseconds;
    expect(getLastRenderRotation()).toBeCloseTo(expectedRotation, 10);
  });

  it("drops drag velocity that became stale before pointer release", async () => {
    const { canvas } = await renderReadyScene();
    environment.setNow(0);
    act(() => {
      canvas.dispatchEvent(
        createPointerEvent("pointerdown", {
          pointerId: 25,
          clientX: 100,
          clientY: 100
        })
      );
    });
    environment.setNow(100);
    act(() => {
      canvas.dispatchEvent(
        createPointerEvent("pointermove", {
          pointerId: 25,
          clientX: 120,
          clientY: 100
        })
      );
      environment.runNextFrame(150);
    });
    environment.setNow(300);
    act(() => {
      canvas.dispatchEvent(
        createPointerEvent("pointerup", {
          pointerId: 25,
          clientX: 120,
          clientY: 100
        })
      );
      environment.runNextFrame(350);
    });

    const directDragTarget = 20 * 0.006;
    const dampingAtFiftyMilliseconds = 1 - Math.pow(1 - 0.08, 3);
    const rotationWhileHeld =
      directDragTarget * dampingAtFiftyMilliseconds;
    const expectedRotation =
      rotationWhileHeld +
      (directDragTarget - rotationWhileHeld) *
        dampingAtFiftyMilliseconds;
    expect(getLastRenderRotation()).toBeCloseTo(expectedRotation, 10);
  });

  it("continues pointer inertia in the same direction with shrinking frame increments", async () => {
    const { canvas } = await renderReadyScene();
    environment.setNow(0);
    act(() => {
      canvas.dispatchEvent(
        createPointerEvent("pointerdown", {
          pointerId: 31,
          clientX: 100,
          clientY: 100
        })
      );
    });
    environment.setNow(100);
    const drag = createPointerEvent("pointermove", {
      pointerId: 31,
      clientX: 120,
      clientY: 100
    });
    act(() => canvas.dispatchEvent(drag));
    act(() => {
      canvas.dispatchEvent(
        createPointerEvent("pointerup", {
          pointerId: 31,
          clientX: 120,
          clientY: 100
        })
      );
    });

    const frictionAtFiftyMilliseconds = Math.pow(0.94, 3);
    const dampingAtFiftyMilliseconds = 1 - Math.pow(1 - 0.08, 3);
    let expectedTarget = 20 * 0.006;
    let expectedVelocity = ((20 * 0.006) / 0.1) * 0.12;
    let expectedRotation = 0;
    const rotations: number[] = [];

    [150, 200, 250].forEach((now) => {
      expectedTarget += expectedVelocity * 0.05;
      expectedVelocity *= frictionAtFiftyMilliseconds;
      expectedRotation +=
        (expectedTarget - expectedRotation) * dampingAtFiftyMilliseconds;

      act(() => environment.runNextFrame(now));
      rotations.push(getLastRenderRotation());
      expect(getLastRenderRotation()).toBeCloseTo(expectedRotation, 10);
    });

    const firstIncrement = rotations[1] - rotations[0];
    const secondIncrement = rotations[2] - rotations[1];
    expect(rotations[0]).toBeGreaterThan(0);
    expect(firstIncrement).toBeGreaterThan(0);
    expect(secondIncrement).toBeGreaterThan(0);
    expect(secondIncrement).toBeLessThan(firstIncrement);
  });

  it("tears down on WebGL loss and creates a fresh scene after restoration", async () => {
    const { canvas } = await renderReadyScene();
    const lostEvent = new Event("webglcontextlost", { cancelable: true });

    act(() => canvas.dispatchEvent(lostEvent));

    expect(lostEvent.defaultPrevented).toBe(true);
    expect(canvas.hasAttribute("data-ready")).toBe(false);
    expect(environment.cancelFrame).toHaveBeenCalledWith(1);
    expect(sceneSpies.disposeScene).toHaveBeenCalledTimes(1);

    act(() => {
      canvas.dispatchEvent(new Event("webglcontextrestored"));
    });

    await waitFor(() => {
      expect(sceneSpies.createScene).toHaveBeenCalledTimes(2);
      expect(canvas.getAttribute("data-ready")).toBe("true");
    });
    expect(sceneSpies.resizeScene).toHaveBeenCalledTimes(2);
    expect(sceneSpies.renderScene).toHaveBeenCalledTimes(2);
    expect(environment.requestFrame).toHaveBeenCalledTimes(2);
    expect(environment.pendingFrames.has(2)).toBe(true);
  });

  it("restarts mounting after WebGL is restored while textures are still loading", async () => {
    let resolveFirstReady!: () => void;
    let resolveSecondReady!: () => void;
    const firstReady = new Promise<void>((resolve) => {
      resolveFirstReady = resolve;
    });
    const secondReady = new Promise<void>((resolve) => {
      resolveSecondReady = resolve;
    });
    sceneSpies.createScene
      .mockImplementationOnce(() => ({
        ready: firstReady,
        render: sceneSpies.renderScene,
        resize: sceneSpies.resizeScene,
        dispose: sceneSpies.disposeScene
      }))
      .mockImplementationOnce(() => ({
        ready: secondReady,
        render: sceneSpies.renderScene,
        resize: sceneSpies.resizeScene,
        dispose: sceneSpies.disposeScene
      }));
    const { container } = render(
      <CurvedHeroScene cards={curvedHeroCards} />
    );
    const canvas = getCanvas(container);

    await waitFor(() => {
      expect(sceneSpies.createScene).toHaveBeenCalledTimes(1);
    });
    const lostEvent = new Event("webglcontextlost", { cancelable: true });
    act(() => {
      canvas.dispatchEvent(lostEvent);
      canvas.dispatchEvent(new Event("webglcontextrestored"));
    });
    expect(lostEvent.defaultPrevented).toBe(true);
    expect(canvas.hasAttribute("data-ready")).toBe(false);
    expect(sceneSpies.disposeScene).toHaveBeenCalledTimes(1);

    resolveFirstReady();
    await waitFor(() => {
      expect(sceneSpies.createScene).toHaveBeenCalledTimes(2);
    });
    expect(canvas.hasAttribute("data-ready")).toBe(false);
    expect(sceneSpies.renderScene).not.toHaveBeenCalled();
    expect(environment.requestFrame).not.toHaveBeenCalled();

    resolveSecondReady();
    await waitFor(() => {
      expect(canvas.getAttribute("data-ready")).toBe("true");
    });
    expect(sceneSpies.renderScene).toHaveBeenCalledTimes(1);
    expect(environment.requestFrame).toHaveBeenCalledTimes(1);
  });

  it("preserves vertical wheel and pointer scrolling while capturing horizontal input", async () => {
    const { canvas } = await renderReadyScene();
    const verticalWheel = new WheelEvent("wheel", {
      cancelable: true,
      deltaX: 2,
      deltaY: 40
    });
    const horizontalWheel = new WheelEvent("wheel", {
      cancelable: true,
      deltaX: 40,
      deltaY: 2
    });

    act(() => canvas.dispatchEvent(verticalWheel));
    act(() => canvas.dispatchEvent(horizontalWheel));

    expect(verticalWheel.defaultPrevented).toBe(false);
    expect(horizontalWheel.defaultPrevented).toBe(true);

    act(() => {
      canvas.dispatchEvent(
        createPointerEvent("pointerdown", {
          pointerId: 7,
          clientX: 100,
          clientY: 100
        })
      );
    });
    const verticalMove = createPointerEvent("pointermove", {
      pointerId: 7,
      clientX: 104,
      clientY: 130
    });
    const horizontalMove = createPointerEvent("pointermove", {
      pointerId: 7,
      clientX: 125,
      clientY: 103
    });

    act(() => canvas.dispatchEvent(verticalMove));
    act(() => canvas.dispatchEvent(horizontalMove));

    expect(verticalMove.defaultPrevented).toBe(false);
    expect(horizontalMove.defaultPrevented).toBe(true);
  });

  it.each([
    { deltaMode: 1, label: "line", normalizedPixels: 16 },
    { deltaMode: 2, label: "page", normalizedPixels: 80 }
  ])(
    "normalizes $label-mode wheel deltas to pixels",
    async ({ deltaMode, normalizedPixels }) => {
      const { canvas } = await renderReadyScene();
      const wheel = new WheelEvent("wheel", {
        cancelable: true,
        deltaMode,
        deltaX: 1
      });

      act(() => {
        canvas.dispatchEvent(wheel);
        environment.runNextFrame(50);
      });

      const deltaRotation = -normalizedPixels * 0.55 * 0.006;
      const targetAfterInertia =
        deltaRotation + deltaRotation * 3.5 * 0.05;
      const dampingAtFiftyMilliseconds = 1 - Math.pow(1 - 0.08, 3);
      expect(wheel.defaultPrevented).toBe(true);
      expect(getLastRenderRotation()).toBeCloseTo(
        targetAfterInertia * dampingAtFiftyMilliseconds,
        10
      );
    }
  );

  it("accepts a new drag after pointer capture setup throws", async () => {
    const { canvas, setPointerCapture } = await renderReadyScene();
    setPointerCapture.mockImplementationOnce(() => {
      throw new Error("capture unavailable");
    });

    act(() => {
      canvas.dispatchEvent(
        createPointerEvent("pointerdown", {
          pointerId: 41,
          clientX: 10,
          clientY: 10
        })
      );
      canvas.dispatchEvent(
        createPointerEvent("pointerdown", {
          pointerId: 42,
          clientX: 10,
          clientY: 10
        })
      );
    });
    const recoveredDrag = createPointerEvent("pointermove", {
      pointerId: 42,
      clientX: 30,
      clientY: 11
    });
    act(() => canvas.dispatchEvent(recoveredDrag));

    expect(setPointerCapture).toHaveBeenCalledTimes(2);
    expect(recoveredDrag.defaultPrevented).toBe(true);
  });

  it("accepts a new drag after the active pointer loses capture", async () => {
    const { canvas } = await renderReadyScene();

    act(() => {
      canvas.dispatchEvent(
        createPointerEvent("pointerdown", {
          pointerId: 51,
          clientX: 10,
          clientY: 10
        })
      );
      canvas.dispatchEvent(
        createPointerEvent("lostpointercapture", {
          pointerId: 51,
          clientX: 10,
          clientY: 10
        })
      );
      canvas.dispatchEvent(
        createPointerEvent("pointerdown", {
          pointerId: 52,
          clientX: 10,
          clientY: 10
        })
      );
    });
    const recoveredDrag = createPointerEvent("pointermove", {
      pointerId: 52,
      clientX: 30,
      clientY: 11
    });
    act(() => canvas.dispatchEvent(recoveredDrag));

    expect(recoveredDrag.defaultPrevented).toBe(true);
  });

  it("releases an uncaptured active pointer when it leaves the canvas", async () => {
    const { canvas, hasPointerCapture } = await renderReadyScene();
    hasPointerCapture.mockReturnValue(false);

    act(() => {
      canvas.dispatchEvent(
        createPointerEvent("pointerdown", {
          pointerId: 61,
          clientX: 10,
          clientY: 10
        })
      );
      canvas.dispatchEvent(
        createPointerEvent("pointerleave", {
          pointerId: 61,
          clientX: 10,
          clientY: 10
        })
      );
      canvas.dispatchEvent(
        createPointerEvent("pointerdown", {
          pointerId: 62,
          clientX: 10,
          clientY: 10
        })
      );
    });
    const recoveredDrag = createPointerEvent("pointermove", {
      pointerId: 62,
      clientX: 30,
      clientY: 11
    });
    act(() => canvas.dispatchEvent(recoveredDrag));

    expect(recoveredDrag.defaultPrevented).toBe(true);
  });

  it("uses cached pointer bounds across consecutive pointer moves", async () => {
    const { canvas } = await renderReadyScene();
    const readBounds = vi
      .spyOn(canvas, "getBoundingClientRect")
      .mockReturnValue(createBounds(20, 100));

    act(() => {
      canvas.dispatchEvent(
        createPointerEvent("pointerenter", {
          pointerId: 70,
          clientX: 20,
          clientY: 20
        })
      );
    });
    act(() => {
      canvas.dispatchEvent(
        createPointerEvent("pointermove", {
          pointerId: 70,
          clientX: 70,
          clientY: 20
        })
      );
      canvas.dispatchEvent(
        createPointerEvent("pointermove", {
          pointerId: 70,
          clientX: 95,
          clientY: 20
        })
      );
    });

    expect(readBounds).toHaveBeenCalledTimes(1);
    act(() => environment.runNextFrame(50));
    expect(sceneSpies.renderScene).toHaveBeenLastCalledWith(
      expect.any(Number),
      0.5
    );
  });

  it("clears desktop pointer parallax when resize crosses into the mobile viewport", async () => {
    const { canvas } = await renderReadyScene();
    const desktopMove = createPointerEvent("pointermove", {
      pointerId: 11,
      clientX: 100,
      clientY: 40
    });

    act(() => canvas.dispatchEvent(desktopMove));
    act(() => environment.runFrame(1, 16));
    expect(sceneSpies.renderScene).toHaveBeenLastCalledWith(
      expect.any(Number),
      1
    );

    environment.setViewportWidth(640);
    act(() => environment.emitResize());
    act(() => environment.runFrame(2, 32));

    expect(sceneSpies.renderScene).toHaveBeenLastCalledWith(
      expect.any(Number),
      0
    );
  });

  it("stops while the document is hidden and resumes with a fresh frame", async () => {
    await renderReadyScene();

    environment.setDocumentHidden(true);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(environment.cancelFrame).toHaveBeenCalledWith(1);

    environment.setDocumentHidden(false);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(environment.requestFrame).toHaveBeenCalledTimes(2);
    expect(environment.pendingFrames.has(2)).toBe(true);
  });
});
