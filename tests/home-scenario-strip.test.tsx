// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomeScenarioStrip } from "../components/home/HomeScenarioStrip";

describe("HomeScenarioStrip", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("identifies the service scenarios as a glass text carousel", () => {
    render(<HomeScenarioStrip />);

    expect(
      screen
        .getByRole("region", { name: "服务场景与能力入口" })
        .getAttribute("data-scenario-layout")
    ).toBe("glass-text-carousel");
  });

  it("exposes the five scenario cards as an ordered list", () => {
    render(<HomeScenarioStrip />);

    const list = screen.getByRole("list");
    const items = within(list).getAllByRole("listitem");

    expect(list.getAttribute("role")).toBe("list");
    expect(items).toHaveLength(5);

    ["认证", "监测", "维权", "授权", "研究"].forEach((label, index) => {
      expect(
        within(items[index]).getByRole("article", { name: label })
      ).toBeTruthy();
    });
  });

  it("replaces imagery with visible descriptions and capability tags", () => {
    render(<HomeScenarioStrip />);

    [
      [
        "认证",
        "建立数字人格权资产的可信记录与权属档案。",
        ["可信记录", "权属档案"]
      ],
      [
        "监测",
        "面向 AIGC 内容传播场景，持续发现疑似侵权线索。",
        ["风险线索", "持续监测"]
      ],
      [
        "维权",
        "围绕证据固定、线索整理和处置协同形成服务闭环。",
        ["证据固定", "协同处置"]
      ],
      [
        "授权",
        "梳理授权边界、使用场景与商业合作记录。",
        ["授权边界", "使用留痕"]
      ],
      [
        "研究",
        "沉淀数字人格权资产与内容治理的合规研究能力。",
        ["合规研究", "内容治理"]
      ]
    ].forEach(([label, description, tags]) => {
      const card = screen.getByRole("article", { name: label as string });

      expect(card.getAttribute("tabindex")).toBe("0");
      expect(within(card).queryByRole("img")).toBeNull();
      expect(within(card).getByText(description as string)).toBeTruthy();
      (tags as string[]).forEach((tag) => {
        expect(within(card).getByText(tag)).toBeTruthy();
      });
    });
  });

  it("places the carousel controls after the image rail", () => {
    render(<HomeScenarioStrip />);

    const list = screen.getByRole("list");
    const previous = screen.getByRole("button", {
      name: "向左浏览服务场景"
    });

    expect(
      list.compareDocumentPosition(previous) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("scrolls left and right by one card with smooth motion", () => {
    const matchMedia = vi.fn(() => ({ matches: false }));
    vi.stubGlobal("matchMedia", matchMedia);
    render(<HomeScenarioStrip />);

    const viewport = screen.getByRole("list").parentElement as HTMLDivElement;
    const firstItem = within(screen.getByRole("list")).getAllByRole(
      "listitem"
    )[0];
    const previous = screen.getByRole("button", {
      name: "向左浏览服务场景"
    });
    const next = screen.getByRole("button", {
      name: "向右浏览服务场景"
    });
    const scrollBy = vi.fn();

    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 500 },
      scrollBy: { configurable: true, value: scrollBy }
    });
    Object.defineProperty(firstItem, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ width: 320 })
    });
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      columnGap: "24px",
      gap: "24px"
    } as CSSStyleDeclaration);

    fireEvent.click(previous);

    expect(scrollBy).toHaveBeenNthCalledWith(1, {
      left: -344,
      behavior: "smooth"
    });

    fireEvent.click(next);

    expect(scrollBy).toHaveBeenNthCalledWith(2, {
      left: 344,
      behavior: "smooth"
    });
    expect(matchMedia).toHaveBeenCalledTimes(2);
    expect(matchMedia).toHaveBeenNthCalledWith(
      1,
      "(prefers-reduced-motion: reduce)"
    );
    expect(matchMedia).toHaveBeenNthCalledWith(
      2,
      "(prefers-reduced-motion: reduce)"
    );
  });

  it("uses instant scrolling when reduced motion is preferred", () => {
    const matchMedia = vi.fn(() => ({ matches: true }));
    vi.stubGlobal("matchMedia", matchMedia);
    render(<HomeScenarioStrip />);

    const viewport = screen.getByRole("list").parentElement as HTMLDivElement;
    const firstItem = within(screen.getByRole("list")).getAllByRole(
      "listitem"
    )[0];
    const next = screen.getByRole("button", {
      name: "向右浏览服务场景"
    });
    const scrollBy = vi.fn();

    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 500 },
      scrollBy: { configurable: true, value: scrollBy }
    });
    Object.defineProperty(firstItem, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ width: 300 })
    });
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      columnGap: "20px",
      gap: "20px"
    } as CSSStyleDeclaration);

    fireEvent.click(next);

    expect(scrollBy).toHaveBeenCalledWith({
      left: 320,
      behavior: "auto"
    });
    expect(matchMedia).toHaveBeenCalledTimes(1);
    expect(matchMedia).toHaveBeenCalledWith(
      "(prefers-reduced-motion: reduce)"
    );
  });

  it("supports keyboard arrow navigation from a focused card", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
    render(<HomeScenarioStrip />);

    const list = screen.getByRole("list");
    const viewport = list.parentElement as HTMLDivElement;
    const firstItem = within(list).getAllByRole("listitem")[0];
    const firstCard = screen.getByRole("article", { name: "认证" });
    const scrollBy = vi.fn();

    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 500 },
      scrollBy: { configurable: true, value: scrollBy }
    });
    Object.defineProperty(firstItem, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ width: 310 })
    });
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      columnGap: "18px",
      gap: "18px"
    } as CSSStyleDeclaration);

    fireEvent.keyDown(firstCard, { key: "ArrowRight" });

    expect(scrollBy).toHaveBeenCalledWith({
      left: 328,
      behavior: "smooth"
    });
  });

  it("starts slightly inside the rail so both edges suggest more content", () => {
    let scheduledFrame: FrameRequestCallback | undefined;
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        scheduledFrame = callback;
        return 1;
      })
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    render(<HomeScenarioStrip />);

    const list = screen.getByRole("list");
    const viewport = list.parentElement as HTMLDivElement;
    const firstItem = within(list).getAllByRole("listitem")[0];

    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 1000 },
      scrollWidth: { configurable: true, value: 1500 },
      scrollLeft: { configurable: true, writable: true, value: 0 }
    });
    Object.defineProperty(firstItem, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ width: 300 })
    });

    scheduledFrame?.(0);

    expect(viewport.scrollLeft).toBe(96);
  });

  it("renders five service scenario cards with lightweight controls", () => {
    render(<HomeScenarioStrip />);

    expect(
      screen.getByRole("region", { name: "服务场景与能力入口" })
    ).toBeTruthy();
    expect(screen.getByText("服务场景")).toBeTruthy();

    ["认证", "监测", "维权", "授权", "研究"].forEach((label) => {
      expect(screen.getByRole("article", { name: label })).toBeTruthy();
    });

    expect(
      screen.getByRole("button", { name: "向左浏览服务场景" })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "向右浏览服务场景" })
    ).toBeTruthy();
  });
});
