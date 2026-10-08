"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Container } from "@/components/common/Container";
import { MegaMenu } from "@/components/layout/MegaMenu";
import {
  megaMenus,
  primaryNavigation,
  type MegaMenuKey
} from "@/content/navigation";
import {
  initialNavigationMenuState,
  isNavigationItemActive,
  navigationMenuReducer,
  shouldFocusFirstMenuLink
} from "@/lib/navigation-menu";
import { cn } from "@/lib/utils";
import styles from "./Navbar.module.css";

const menuIds: Record<MegaMenuKey, string> = {
  services: "desktop-services-menu",
  compliance: "desktop-compliance-menu"
};

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<MegaMenuKey | null>(
    null
  );
  const [desktopMenu, dispatchDesktopMenu] = useReducer(
    navigationMenuReducer,
    initialNavigationMenuState
  );
  const menuTriggerRefs = useRef<
    Record<MegaMenuKey, HTMLButtonElement | null>
  >({
    services: null,
    compliance: null
  });
  const menuPanelRefs = useRef<Record<MegaMenuKey, HTMLDivElement | null>>({
    services: null,
    compliance: null
  });
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const { activeMenu, pinnedMenu } = desktopMenu;

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setMobileExpanded(null);
  };

  useEffect(() => {
    dispatchDesktopMenu({ type: "CLOSE" });
    setMobileMenuOpen(false);
    setMobileExpanded(null);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (activeMenu) {
        const trigger = menuTriggerRefs.current[activeMenu];
        dispatchDesktopMenu({ type: "CLOSE" });
        requestAnimationFrame(() => trigger?.focus());
        return;
      }

      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
        setMobileExpanded(null);
        requestAnimationFrame(() => mobileMenuButtonRef.current?.focus());
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeMenu, mobileMenuOpen]);

  const focusFirstMenuLink = (menuKey: MegaMenuKey) => {
    menuPanelRefs.current[menuKey]
      ?.querySelector<HTMLAnchorElement>("a")
      ?.focus();
  };

  const openMenuAndFocusFirstLink = (menuKey: MegaMenuKey) => {
    dispatchDesktopMenu({
      type: pinnedMenu === menuKey ? "HOVER" : "TOGGLE",
      menu: menuKey
    });
    requestAnimationFrame(() => focusFirstMenuLink(menuKey));
  };

  return (
    <header
      className={cn("sticky top-0 z-50", styles.header)}
      onMouseLeave={() => dispatchDesktopMenu({ type: "LEAVE" })}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          dispatchDesktopMenu({ type: "CLOSE" });
        }
      }}
    >
      <Container className={cn("relative z-30", styles.container)}>
        <nav
          className={cn(
            "flex h-16 items-center justify-between gap-4",
            styles.navigation
          )}
          aria-label="主导航"
        >
          <Link
            href="/"
            className={cn(
              "flex min-w-0 items-center gap-2.5 outline-none",
              styles.brandLink
            )}
            onClick={closeMobileMenu}
          >
            <BrandMark size={32} preload />
            <span className="min-w-0">
              <span
                className={cn(
                  "block truncate text-sm font-semibold",
                  styles.brandTitle
                )}
              >
                首版认证
              </span>
              <span
                className={cn(
                  "hidden truncate text-xs md:block",
                  styles.brandSubtitle
                )}
              >
                数字人格权资产服务
              </span>
            </span>
          </Link>

          <div
            className={cn(
              "hidden h-full items-center lg:flex",
              styles.desktopNavigation
            )}
          >
            {primaryNavigation.map((item) => {
              const active = isNavigationItemActive(item, pathname);

              if ("menuKey" in item) {
                const menuKey = item.menuKey;
                const menuOpen = activeMenu === menuKey;

                return (
                  <button
                    key={item.href}
                    ref={(node) => {
                      menuTriggerRefs.current[menuKey] = node;
                    }}
                    type="button"
                    aria-expanded={menuOpen}
                    aria-controls={menuIds[menuKey]}
                    aria-current={active ? "page" : undefined}
                    onMouseEnter={() =>
                      dispatchDesktopMenu({ type: "HOVER", menu: menuKey })
                    }
                    onClick={(event) => {
                      const focusAfterOpen = shouldFocusFirstMenuLink(
                        desktopMenu,
                        menuKey,
                        event.detail
                      );

                      dispatchDesktopMenu({ type: "TOGGLE", menu: menuKey });

                      if (focusAfterOpen) {
                        requestAnimationFrame(() =>
                          focusFirstMenuLink(menuKey)
                        );
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        openMenuAndFocusFirstLink(menuKey);
                      }
                    }}
                    className={cn(
                      "relative inline-flex h-full items-center gap-1 outline-none",
                      styles.desktopItem,
                      active && styles.desktopItemActive
                    )}
                  >
                    {item.label}
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5",
                        styles.chevron,
                        menuOpen && "rotate-180"
                      )}
                      aria-hidden="true"
                    />
                  </button>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onMouseEnter={() =>
                    dispatchDesktopMenu({ type: "CLOSE" })
                  }
                  className={cn(
                    "relative inline-flex h-full items-center outline-none",
                    styles.desktopItem,
                    active && styles.desktopItemActive
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <button
            type="button"
            className={cn(
              "inline-flex h-11 w-11 flex-none items-center justify-center outline-none lg:hidden",
              styles.mobileToggle
            )}
            aria-label={
              mobileMenuOpen ? "关闭主导航菜单" : "打开主导航菜单"
            }
            aria-expanded={mobileMenuOpen}
            aria-controls={mobileMenuOpen ? "mobile-navigation" : undefined}
            ref={mobileMenuButtonRef}
            onClick={() => {
              dispatchDesktopMenu({ type: "CLOSE" });
              setMobileMenuOpen((current) => !current);
              setMobileExpanded(null);
            }}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </nav>
      </Container>

      {activeMenu ? (
        <div className="nav-page-recess hidden lg:block" aria-hidden="true" />
      ) : null}

      {(Object.keys(megaMenus) as MegaMenuKey[]).map((menuKey) => (
        <MegaMenu
          key={menuKey}
          id={menuIds[menuKey]}
          menu={megaMenus[menuKey]}
          open={activeMenu === menuKey}
          panelRef={(node) => {
            menuPanelRefs.current[menuKey] = node;
          }}
          onNavigate={() => dispatchDesktopMenu({ type: "CLOSE" })}
        />
      ))}

      {mobileMenuOpen ? (
        <div
          id="mobile-navigation"
          className={cn(
            "max-h-[calc(100dvh-4rem)] overflow-y-auto overflow-x-hidden lg:hidden",
            styles.mobilePanel
          )}
        >
          <Container className={styles.mobileContainer}>
            <div className={cn("grid", styles.mobileList)}>
              {primaryNavigation.map((item) => {
                const active = isNavigationItemActive(item, pathname);

                if ("menuKey" in item) {
                  const menuKey = item.menuKey;
                  const expanded = mobileExpanded === menuKey;
                  const mobileMenuId = `mobile-${menuKey}-menu`;

                  return (
                    <div
                      key={item.href}
                      className={styles.mobileGroup}
                    >
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={expanded ? mobileMenuId : undefined}
                        aria-current={active ? "page" : undefined}
                        onClick={() =>
                          setMobileExpanded((current) =>
                            current === menuKey ? null : menuKey
                          )
                        }
                        className={cn(
                          "flex w-full items-center justify-between gap-3 text-left text-sm outline-none",
                          styles.mobileItem,
                          active && styles.mobileItemActive
                        )}
                      >
                        {item.label}
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 flex-none",
                            styles.chevron,
                            expanded && "rotate-180"
                          )}
                          aria-hidden="true"
                        />
                      </button>

                      {expanded ? (
                        <div
                          id={mobileMenuId}
                          className={cn("grid", styles.mobileSubmenu)}
                        >
                          {megaMenus[menuKey].columns.map((column) => (
                            <section key={column.title}>
                              <p className={styles.mobileColumnTitle}>
                                {column.title}
                              </p>
                              <div
                                className={cn(
                                  "grid",
                                  styles.mobileSubmenuLinks
                                )}
                              >
                                {column.links.map((link) => (
                                  <Link
                                    key={`${column.title}-${link.label}`}
                                    href={link.href}
                                    onClick={closeMobileMenu}
                                    className={cn(
                                      "outline-none",
                                      styles.mobileSubmenuLink
                                    )}
                                  >
                                    <span
                                      className={styles.mobileSubmenuLabel}
                                    >
                                      {link.label}
                                    </span>
                                    <span
                                      className={
                                        styles.mobileSubmenuDescription
                                      }
                                    >
                                      {link.description}
                                    </span>
                                  </Link>
                                ))}
                              </div>
                            </section>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={closeMobileMenu}
                    className={cn(
                      "text-sm outline-none",
                      styles.mobileItem,
                      styles.mobileDirectLink,
                      active && styles.mobileItemActive
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
