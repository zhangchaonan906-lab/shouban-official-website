// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HeroImageCarousel } from "../components/home/HeroImageCarousel";

type MatchMediaController = {
  setMatches: (matches: boolean) => void;
  removeEventListener: ReturnType<typeof vi.fn>;
};

function installMatchMedia(initialMatches = false): MatchMediaController {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const media = "(prefers-reduced-motion: reduce)";
  const addEventListener = vi.fn(
    (
      eventName: string,
      listener: EventListenerOrEventListenerObject
    ) => {
      if (eventName === "change" && typeof listener === "function") {
        listeners.add(listener as (event: MediaQueryListEvent) => void);
      }
    }
  );
  const removeEventListener = vi.fn(
    (
      eventName: string,
      listener: EventListenerOrEventListenerObject
    ) => {
      if (eventName === "change" && typeof listener === "function") {
        listeners.delete(listener as (event: MediaQueryListEvent) => void);
      }
    }
  );

  const mediaQueryList = {
    get matches() {
      return matches;
    },
    media,
    onchange: null,
    addEventListener,
    removeEventListener,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  } as unknown as MediaQueryList;

  vi.stubGlobal("matchMedia", vi.fn(() => mediaQueryList));

  return {
    removeEventListener,
    setMatches(nextMatches) {
      matches = nextMatches;
      const event = { matches, media } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    }
  };
}

function getActiveSlide(container: HTMLElement): HTMLElement {
  const activeSlide = container.querySelector<HTMLElement>(
    '[aria-roledescription="slide"][data-active="true"]'
  );

  if (!activeSlide) {
    throw new Error("Expected an active carousel slide.");
  }

  return activeSlide;
}

function advanceTime(milliseconds: number) {
  act(() => {
    vi.advanceTimersByTime(milliseconds);
  });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  installMatchMedia();
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("HeroImageCarousel", () => {
  it("renders split copy and visual stages with two actions per slide", () => {
    const { container } = render(<HeroImageCarousel />);
    const slides = Array.from(
      container.querySelectorAll<HTMLElement>(
        '[aria-roledescription="slide"]'
      )
    );

    expect(slides).toHaveLength(3);
    expect(container.querySelectorAll("[data-hero-copy]")).toHaveLength(3);
    expect(container.querySelectorAll("[data-hero-visual-stage]")).toHaveLength(
      3
    );
    expect(container.querySelectorAll("[data-hero-card]")).toHaveLength(0);
    expect(slides[0].querySelectorAll("a")).toHaveLength(2);
    expect(
      Array.from(slides[0].querySelectorAll("a")).every(
        (link) => link.getAttribute("tabindex") === null
      )
    ).toBe(true);

    slides.slice(1).forEach((slide) => {
      expect(slide.getAttribute("aria-hidden")).toBe("true");
      expect(
        Array.from(slide.querySelectorAll("a")).every(
          (link) => link.getAttribute("tabindex") === "-1"
        )
      ).toBe(true);
    });
  });

  it("uses responsive sizes for the campus image", () => {
    render(<HeroImageCarousel />);

    const campusImage = screen.getByRole("img", {
      name: "北京首版认证办公园区外景"
    });

    expect(
      decodeURIComponent(campusImage.getAttribute("src") ?? "")
    ).toContain("/images/hero/shouban-campus.jpg");
    expect(campusImage.getAttribute("alt")).toBe(
      "北京首版认证办公园区外景"
    );
    expect(campusImage.getAttribute("sizes")).toBe(
      "(min-width: 1280px) 650px, (min-width: 1024px) calc(56vw - 67px), " +
        "(min-width: 640px) calc(100vw - 48px), calc(100vw - 32px)"
    );
  });

  it("uses dot-only pagination without heavy playback or arrow controls", () => {
    render(<HeroImageCarousel />);

    expect(
      screen.queryByRole("button", { name: "暂停轮播" })
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "播放轮播" })
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "切换到上一屏" })
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "切换到下一屏" })
    ).toBeNull();
    expect(
      screen.getAllByRole("button", { name: /切换到第\d屏/ })
    ).toHaveLength(3);
  });

  it("advances after six seconds and clears its timer on unmount", () => {
    const matchMedia = installMatchMedia();
    const { container, unmount } = render(<HeroImageCarousel />);

    expect(getActiveSlide(container).getAttribute("aria-label")).toBe("1 / 3");
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    advanceTime(6000);
    expect(getActiveSlide(container).getAttribute("aria-label")).toBe("2 / 3");

    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(matchMedia.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    );
  });

  it("pauses while hovered and resumes after the pointer leaves", () => {
    const { container } = render(<HeroImageCarousel />);
    const carousel = screen.getByLabelText("首版认证首页主视觉");

    fireEvent.mouseEnter(carousel);
    advanceTime(6000);
    expect(getActiveSlide(container).getAttribute("aria-label")).toBe("1 / 3");

    fireEvent.mouseLeave(carousel);
    advanceTime(6000);
    expect(getActiveSlide(container).getAttribute("aria-label")).toBe("2 / 3");
  });

  it("pauses while focus is inside and resumes after focus leaves", () => {
    const { container } = render(<HeroImageCarousel />);
    const secondDot = screen.getByRole("button", { name: "切换到第2屏" });

    fireEvent.focus(secondDot);
    advanceTime(6000);
    expect(getActiveSlide(container).getAttribute("aria-label")).toBe("1 / 3");

    fireEvent.blur(secondDot, { relatedTarget: null });
    advanceTime(6000);
    expect(getActiveSlide(container).getAttribute("aria-label")).toBe("2 / 3");
  });

  it("stays static when reduced motion is requested", () => {
    installMatchMedia(true);
    const { container } = render(<HeroImageCarousel />);

    advanceTime(12000);
    expect(getActiveSlide(container).getAttribute("aria-label")).toBe("1 / 3");
  });

  it("stops playback when the motion preference changes to reduce", () => {
    const matchMedia = installMatchMedia();
    const { container } = render(<HeroImageCarousel />);

    act(() => {
      matchMedia.setMatches(true);
    });

    advanceTime(6000);
    expect(getActiveSlide(container).getAttribute("aria-label")).toBe("1 / 3");
  });

  it("resets timing even when the current pagination dot is selected", () => {
    const { container } = render(<HeroImageCarousel />);

    advanceTime(4000);
    fireEvent.click(screen.getByRole("button", { name: "切换到第1屏" }));

    advanceTime(3000);
    expect(getActiveSlide(container).getAttribute("aria-label")).toBe("1 / 3");

    advanceTime(3000);
    expect(getActiveSlide(container).getAttribute("aria-label")).toBe("2 / 3");
  });

  it("keeps automatic status silent and announces only manual navigation", () => {
    const { container } = render(<HeroImageCarousel />);
    const automaticStatus = container.querySelector<HTMLElement>(
      '[data-carousel-status="automatic"]'
    );
    const manualStatus = container.querySelector<HTMLElement>(
      '[data-carousel-status="manual"]'
    );

    expect(automaticStatus?.getAttribute("aria-live")).toBe("off");
    expect(manualStatus?.getAttribute("aria-live")).toBe("polite");
    expect(manualStatus?.textContent).toBe("");

    advanceTime(6000);
    expect(automaticStatus?.textContent).toContain("第 2 屏");
    expect(manualStatus?.textContent).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "切换到第3屏" }));
    expect(manualStatus?.textContent).toContain("第 3 屏");

    const manualAnnouncement = manualStatus?.textContent;
    advanceTime(6000);
    expect(automaticStatus?.textContent).toContain("第 1 屏");
    expect(manualStatus?.textContent).toBe(manualAnnouncement);
  });
});
