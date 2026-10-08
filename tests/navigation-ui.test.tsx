import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MegaMenu } from "../components/layout/MegaMenu";
import { megaMenus } from "../content/navigation";

describe("MegaMenu", () => {
  it("renders the services menu structure and descriptions", () => {
    const menu = megaMenus.services;
    const markup = renderToStaticMarkup(
      <MegaMenu id="services-menu" menu={menu} open={true} />
    );

    expect(markup).toContain('role="region"');
    expect(markup).toContain(`aria-label="${menu.label}扩展导航"`);
    expect(markup).toContain('aria-hidden="false"');
    expect(markup).toContain('data-state="open"');
    expect(markup).toContain("mega-menu-panel");
    expect(markup).toContain("Explore");
    expect(markup).not.toContain('tabindex="-1"');

    menu.columns.forEach((column) => {
      expect(markup).toContain(column.title);

      column.links.forEach((link) => {
        expect(markup).toContain(link.label);
        expect(markup).toContain(link.description);
      });
    });
  });

  it("marks the closed menu as non-interactive", () => {
    const markup = renderToStaticMarkup(
      <MegaMenu
        id="services-menu"
        menu={megaMenus.services}
        open={false}
      />
    );

    expect(markup).toContain('data-state="closed"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("invisible");
    expect(markup).toContain("pointer-events-none");
    expect(markup.match(/tabindex="-1"/g)).toHaveLength(
      megaMenus.services.columns.reduce(
        (total, column) => total + column.links.length,
        0
      )
    );
  });
});
