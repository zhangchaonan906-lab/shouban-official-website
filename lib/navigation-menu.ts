import type { MegaMenuKey, NavigationItem } from "@/content/navigation";

export type NavigationMenuState = {
  readonly activeMenu: MegaMenuKey | null;
  readonly pinnedMenu: MegaMenuKey | null;
};

export type NavigationMenuAction =
  | { readonly type: "HOVER"; readonly menu: MegaMenuKey }
  | { readonly type: "TOGGLE"; readonly menu: MegaMenuKey }
  | { readonly type: "LEAVE" }
  | { readonly type: "CLOSE" };

export const initialNavigationMenuState: NavigationMenuState = {
  activeMenu: null,
  pinnedMenu: null
};

export function shouldFocusFirstMenuLink(
  state: NavigationMenuState,
  menu: MegaMenuKey,
  eventDetail: number
) {
  return eventDetail === 0 && state.pinnedMenu !== menu;
}

export function isNavigationItemActive(
  item: NavigationItem,
  pathname: string
) {
  const activeHrefs = item.activeHrefs ?? [item.href.split("#")[0]];

  return activeHrefs.some(
    (href) =>
      pathname === href || (href !== "/" && pathname.startsWith(`${href}/`))
  );
}

export function navigationMenuReducer(
  state: NavigationMenuState,
  action: NavigationMenuAction
): NavigationMenuState {
  switch (action.type) {
    case "HOVER":
      return {
        activeMenu: action.menu,
        pinnedMenu: state.pinnedMenu
      };
    case "TOGGLE":
      return state.pinnedMenu === action.menu
        ? initialNavigationMenuState
        : {
            activeMenu: action.menu,
            pinnedMenu: action.menu
          };
    case "LEAVE":
      return {
        activeMenu: state.pinnedMenu,
        pinnedMenu: state.pinnedMenu
      };
    case "CLOSE":
      return initialNavigationMenuState;
  }
}
