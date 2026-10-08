import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Ref } from "react";
import { Container } from "@/components/common/Container";
import type { MegaMenuGroup } from "@/content/navigation";
import { cn } from "@/lib/utils";
import styles from "./MegaMenu.module.css";

type MegaMenuProps = {
  menu: MegaMenuGroup;
  open: boolean;
  id: string;
  panelRef?: Ref<HTMLDivElement>;
  onNavigate?: () => void;
};

export function MegaMenu({
  menu,
  open,
  id,
  panelRef,
  onNavigate
}: MegaMenuProps) {
  return (
    <div
      ref={panelRef}
      id={id}
      role="region"
      aria-label={`${menu.label}扩展导航`}
      aria-hidden={!open}
      data-state={open ? "open" : "closed"}
      className={cn(
        "mega-menu-panel absolute inset-x-0 top-full z-20 hidden transition-[opacity,transform,visibility] duration-200 lg:block",
        styles.panel,
        open
          ? "visible pointer-events-auto translate-y-0 opacity-100"
          : "invisible pointer-events-none -translate-y-2 opacity-0"
      )}
    >
      <Container className={styles.container}>
        <div className={cn("grid", styles.grid)}>
          {menu.columns.map((column, columnIndex) => (
            <section
              key={column.title}
              className={cn(
                "min-w-0",
                styles.column,
                columnIndex > 0 && styles.secondaryColumn
              )}
            >
              {columnIndex === 0 ? (
                <>
                  <p className={styles.exploreLabel}>Explore</p>
                  <p className={styles.primaryColumnTitle}>
                    {column.title}
                  </p>
                </>
              ) : (
                <p className={styles.columnTitle}>{column.title}</p>
              )}
              <div
                className={cn(
                  "grid",
                  styles.linkList,
                  columnIndex === 0 && styles.primaryLinkList
                )}
              >
                {column.links.map((link) => (
                  <Link
                    key={`${column.title}-${link.label}`}
                    href={link.href}
                    onClick={onNavigate}
                    tabIndex={open ? undefined : -1}
                    className={cn(
                      "group flex items-start justify-between gap-4 outline-none",
                      styles.link,
                      columnIndex === 0 && styles.primaryLink
                    )}
                  >
                    <span>
                      <span
                        className={cn(
                          styles.linkTitle,
                          columnIndex === 0 && styles.primaryLinkTitle
                        )}
                      >
                        {link.label}
                      </span>
                      <span
                        className={cn(
                          styles.linkDescription,
                          columnIndex === 0 && styles.primaryLinkDescription
                        )}
                      >
                        {link.description}
                      </span>
                    </span>
                    <ArrowUpRight
                      className={cn(
                        "mt-0.5 h-4 w-4 flex-none",
                        styles.arrow
                      )}
                      aria-hidden="true"
                    />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Container>
    </div>
  );
}
