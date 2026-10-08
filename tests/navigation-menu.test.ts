import { describe, expect, it } from "vitest";
import {
  initialNavigationMenuState,
  isNavigationItemActive,
  navigationMenuReducer,
  shouldFocusFirstMenuLink
} from "../lib/navigation-menu";
import { primaryNavigation } from "../content/navigation";

describe("navigationMenuReducer", () => {
  it("opens a hovered menu without pinning it", () => {
    const state = navigationMenuReducer(initialNavigationMenuState, {
      type: "HOVER",
      menu: "services"
    });

    expect(state).toEqual({
      activeMenu: "services",
      pinnedMenu: null
    });
  });

  it("pins the first toggle even when hover already opened the menu", () => {
    const hovered = navigationMenuReducer(initialNavigationMenuState, {
      type: "HOVER",
      menu: "services"
    });
    const pinned = navigationMenuReducer(hovered, {
      type: "TOGGLE",
      menu: "services"
    });

    expect(pinned).toEqual({
      activeMenu: "services",
      pinnedMenu: "services"
    });
  });

  it("closes only when toggling the same pinned menu again", () => {
    const pinned = {
      activeMenu: "services",
      pinnedMenu: "services"
    } as const;

    expect(
      navigationMenuReducer(pinned, {
        type: "TOGGLE",
        menu: "services"
      })
    ).toEqual(initialNavigationMenuState);

    expect(
      navigationMenuReducer(pinned, {
        type: "TOGGLE",
        menu: "compliance"
      })
    ).toEqual({
      activeMenu: "compliance",
      pinnedMenu: "compliance"
    });
  });

  it("closes an unpinned hover on leave and restores a pinned menu", () => {
    expect(
      navigationMenuReducer(
        { activeMenu: "services", pinnedMenu: null },
        { type: "LEAVE" }
      )
    ).toEqual(initialNavigationMenuState);

    expect(
      navigationMenuReducer(
        { activeMenu: "compliance", pinnedMenu: "services" },
        { type: "LEAVE" }
      )
    ).toEqual({
      activeMenu: "services",
      pinnedMenu: "services"
    });
  });

  it("clears active and pinned menus", () => {
    expect(
      navigationMenuReducer(
        { activeMenu: "services", pinnedMenu: "services" },
        { type: "CLOSE" }
      )
    ).toEqual(initialNavigationMenuState);
  });
});

describe("shouldFocusFirstMenuLink", () => {
  it("focuses after a keyboard click that will open the menu", () => {
    expect(
      shouldFocusFirstMenuLink(
        { activeMenu: "services", pinnedMenu: null },
        "services",
        0
      )
    ).toBe(true);
  });

  it("does not focus when the same pinned menu will close", () => {
    expect(
      shouldFocusFirstMenuLink(
        { activeMenu: "services", pinnedMenu: "services" },
        "services",
        0
      )
    ).toBe(false);
  });

  it("does not move focus for mouse clicks", () => {
    expect(
      shouldFocusFirstMenuLink(
        initialNavigationMenuState,
        "services",
        1
      )
    ).toBe(false);
  });
});

describe("isNavigationItemActive", () => {
  it("keeps grouped secondary routes attached to their top-level section", () => {
    const compliance = primaryNavigation.find(
      (item) => item.href === "/compliance"
    );
    const about = primaryNavigation.find((item) => item.href === "/about");

    expect(compliance).toBeDefined();
    expect(about).toBeDefined();
    expect(isNavigationItemActive(compliance!, "/news/article-slug")).toBe(
      true
    );
    expect(isNavigationItemActive(about!, "/contact")).toBe(true);
  });
});
