// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeferredFooterVideo } from "@/components/layout/DeferredFooterVideo";

type ObserverCallback = IntersectionObserverCallback;

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: ObserverCallback;
  observed: Element[] = [];
  disconnect = vi.fn();

  constructor(callback: ObserverCallback) {
    this.callback = callback;
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
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: false })
    );
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("waits until the footer video approaches the viewport before loading it", () => {
    render(
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
    expect(observer.disconnect).toHaveBeenCalledOnce();
  });

  it("does not initialize decorative video when reduced motion is preferred", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: true })
    );

    render(
      <DeferredFooterVideo
        src="/video/home-growth-cta.mp4"
        poster="/images/home/home-growth-cta-poster.jpg"
        className="footer-video-media__video"
      />
    );

    const video = document.querySelector("video") as HTMLVideoElement;

    expect(video.getAttribute("src")).toBeNull();
    expect(video.getAttribute("poster")).toBeNull();
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });
});
