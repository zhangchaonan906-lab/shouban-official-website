// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeferredFooterVideo } from "@/components/layout/DeferredFooterVideo";

type ObserverCallback = IntersectionObserverCallback;
type MotionPreferenceListener = (event: MediaQueryListEvent) => void;

class MockMediaQueryList {
  matches = false;
  listeners = new Set<MotionPreferenceListener>();
  addEventListener = vi.fn(
    (_type: "change", listener: MotionPreferenceListener) => {
      this.listeners.add(listener);
    }
  );
  removeEventListener = vi.fn(
    (_type: "change", listener: MotionPreferenceListener) => {
      this.listeners.delete(listener);
    }
  );

  change(matches: boolean) {
    this.matches = matches;
    for (const listener of this.listeners) {
      listener({ matches } as MediaQueryListEvent);
    }
  }
}

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: ObserverCallback;
  observed: Element[] = [];
  disconnect = vi.fn();
  options?: IntersectionObserverInit;

  constructor(callback: ObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }

  observe = (element: Element) => {
    this.observed.push(element);
  };

  unobserve = vi.fn();
  takeRecords = () => [];

  enter(element = this.observed[0]) {
    this.callback(
      [{ isIntersecting: true, target: element } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  }
}

describe("DeferredFooterVideo", () => {
  let motionQuery: MockMediaQueryList;

  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    motionQuery = new MockMediaQueryList();
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.stubGlobal("matchMedia", vi.fn(() => motionQuery));
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("waits until the footer video approaches the viewport before loading it", () => {
    const { unmount } = render(
      <DeferredFooterVideo
        src="/video/home-growth-cta.mp4"
        poster="/images/home/home-growth-cta-poster.jpg"
        className="footer-video-media__video"
      />
    );

    const video = document.querySelector("video") as HTMLVideoElement;
    const observer = MockIntersectionObserver.instances[0];

    expect(video.getAttribute("src")).toBeNull();
    expect(video.getAttribute("poster")).toBeNull();
    expect(video.dataset.src).toBe("/video/home-growth-cta.mp4");
    expect(observer.observed).toEqual([video]);

    act(() => observer.enter(video));

    expect(video.getAttribute("src")).toBe("/video/home-growth-cta.mp4");
    expect(video.getAttribute("poster")).toBe(
      "/images/home/home-growth-cta-poster.jpg"
    );
    expect(HTMLMediaElement.prototype.load).toHaveBeenCalledOnce();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
    expect(observer.disconnect).not.toHaveBeenCalled();

    act(() => motionQuery.change(true));
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledOnce();

    act(() => motionQuery.change(false));
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
    expect(HTMLMediaElement.prototype.load).toHaveBeenCalledOnce();

    unmount();
    expect(observer.disconnect).toHaveBeenCalledOnce();
    expect(motionQuery.removeEventListener).toHaveBeenCalledOnce();
  });

  it("does not load initially when reduced motion is preferred and resumes when visible", () => {
    motionQuery.matches = true;

    const { unmount } = render(
      <DeferredFooterVideo
        src="/video/home-growth-cta.mp4"
        poster="/images/home/home-growth-cta-poster.jpg"
        className="footer-video-media__video"
      />
    );

    const video = document.querySelector("video") as HTMLVideoElement;

    expect(video.getAttribute("src")).toBeNull();
    expect(video.getAttribute("poster")).toBeNull();
    const observer = MockIntersectionObserver.instances[0];
    expect(observer.observed).toEqual([video]);
    expect(HTMLMediaElement.prototype.load).not.toHaveBeenCalled();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();

    act(() => observer.enter(video));
    expect(video.getAttribute("src")).toBeNull();

    act(() => motionQuery.change(false));
    expect(video.getAttribute("src")).toBe("/video/home-growth-cta.mp4");
    expect(HTMLMediaElement.prototype.load).toHaveBeenCalledOnce();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();

    unmount();
    expect(motionQuery.removeEventListener).toHaveBeenCalledOnce();
    expect(observer.disconnect).toHaveBeenCalled();
  });

  it("does not resume when reduced motion is disabled outside the viewport", () => {
    motionQuery.matches = true;

    render(
      <DeferredFooterVideo
        src="/video/home-growth-cta.mp4"
        poster="/images/home/home-growth-cta-poster.jpg"
        className="footer-video-media__video"
      />
    );

    const video = document.querySelector("video") as HTMLVideoElement;
    const observer = MockIntersectionObserver.instances[0];

    act(() => motionQuery.change(false));
    expect(video.getAttribute("src")).toBeNull();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();

    act(() => observer.enter(video));
    expect(video.getAttribute("src")).toBe("/video/home-growth-cta.mp4");
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
  });

  it("removes the motion and viewport listeners on unmount", () => {
    const { unmount } = render(
      <DeferredFooterVideo
        src="/video/home-growth-cta.mp4"
        poster="/images/home/home-growth-cta-poster.jpg"
        className="footer-video-media__video"
      />
    );

    const observer = MockIntersectionObserver.instances[0];
    unmount();

    expect(motionQuery.removeEventListener).toHaveBeenCalledOnce();
    expect(observer.disconnect).toHaveBeenCalledOnce();
  });
});
