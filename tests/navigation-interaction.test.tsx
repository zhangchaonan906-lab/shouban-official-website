// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Navbar } from "../components/layout/Navbar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/"
}));

function classTokens(element: Element) {
  return element.className.split(/\s+/);
}

describe("Navbar interactions", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "requestAnimationFrame",
      (callback: FrameRequestCallback) => {
        callback(performance.now());
        return 1;
      }
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens the desktop services menu by click and ArrowDown, then restores focus on Escape", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    const trigger = screen.getByRole("button", { name: "服务与产品" });
    const panel = document.getElementById("desktop-services-menu");

    expect(panel).not.toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(panel!.getAttribute("data-state")).toBe("closed");
    expect(classTokens(panel!)).toContain("invisible");
    expect(
      Array.from(panel!.querySelectorAll("a")).every(
        (link) => link.getAttribute("tabindex") === "-1"
      )
    ).toBe(true);

    await user.click(trigger);

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(panel!.getAttribute("aria-hidden")).toBe("false");
    expect(panel!.getAttribute("data-state")).toBe("open");
    expect(classTokens(panel!)).toContain("visible");
    expect(classTokens(panel!)).not.toContain("invisible");
    expect(
      Array.from(panel!.querySelectorAll("a")).every(
        (link) => link.getAttribute("tabindex") === null
      )
    ).toBe(true);

    await user.keyboard("{Escape}");

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(panel!.getAttribute("aria-hidden")).toBe("true");
    expect(panel!.getAttribute("data-state")).toBe("closed");
    expect(classTokens(panel!)).toContain("invisible");
    expect(document.activeElement).toBe(trigger);

    await user.keyboard("{ArrowDown}");

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(panel!.getAttribute("data-state")).toBe("open");
    expect(document.activeElement).toBe(panel!.querySelector("a"));
  });

  it("opens the mobile navigation and expands a mobile submenu", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    const mobileToggle = screen.getByRole("button", {
      name: "打开主导航菜单"
    });

    expect(mobileToggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById("mobile-navigation")).toBeNull();

    await user.click(mobileToggle);

    const mobileNavigation = document.getElementById("mobile-navigation");
    expect(mobileNavigation).not.toBeNull();
    expect(classTokens(mobileNavigation!)).toContain(
      "max-h-[calc(100dvh-4rem)]"
    );
    expect(mobileToggle.getAttribute("aria-expanded")).toBe("true");
    expect(mobileToggle.getAttribute("aria-label")).toBe("关闭主导航菜单");

    const servicesToggle = within(mobileNavigation!).getByRole("button", {
      name: "服务与产品"
    });
    expect(servicesToggle.getAttribute("aria-expanded")).toBe("false");

    await user.click(servicesToggle);

    const mobileServicesMenu = document.getElementById(
      "mobile-services-menu"
    );
    expect(servicesToggle.getAttribute("aria-expanded")).toBe("true");
    expect(servicesToggle.getAttribute("aria-controls")).toBe(
      "mobile-services-menu"
    );
    expect(mobileServicesMenu).not.toBeNull();
    expect(
      within(mobileServicesMenu!).getByRole("link", {
        name: /数字人格权资产认证/
      })
    ).toBeTruthy();

    await user.click(mobileToggle);

    expect(document.getElementById("mobile-navigation")).toBeNull();
    expect(mobileToggle.getAttribute("aria-expanded")).toBe("false");
    expect(mobileToggle.getAttribute("aria-label")).toBe("打开主导航菜单");
  });
});
