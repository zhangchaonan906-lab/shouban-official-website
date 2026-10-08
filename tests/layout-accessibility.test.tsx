import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import RootLayout from "../app/layout";

vi.mock("next/navigation", () => ({
  usePathname: () => "/"
}));

describe("root layout accessibility", () => {
  it("provides a keyboard skip link to the main content", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <div>页面内容</div>
      </RootLayout>
    );
    const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

    expect(markup).toContain('href="#main-content"');
    expect(markup).toContain('id="main-content"');
    expect(markup).toMatch(
      /<a(?=[^>]*href="#main-content")(?=[^>]*class="[^"]*\bskip-link\b[^"]*")[^>]*>[^<]*跳到正文[^<]*<\/a>/
    );
    expect(css).toMatch(
      /@media print[\s\S]*?\.skip-link[^{]*\{[^}]*display:\s*none\s*!important/s
    );
  });
});
