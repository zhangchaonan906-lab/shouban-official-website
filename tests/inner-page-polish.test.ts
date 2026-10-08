import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("inner page readability and focus polish", () => {
  it("keeps compact solution and news metadata at readable ink contrast", () => {
    const solutions = read("app/solutions/page.tsx");
    const news = read("app/news/page.tsx");

    expect(solutions).toContain(
      'font-mono text-xs text-[rgba(11,19,43,0.68)]'
    );
    expect(solutions).not.toContain("text-[rgba(11,19,43,0.42)]");
    expect(news).toContain(
      'gap-3 text-xs text-[rgba(11,19,43,0.68)]'
    );
    expect(news).not.toContain("text-[rgba(11,19,43,0.52)]");
  });

  it("matches the news focus ring clipping radius to the 24px card", () => {
    const news = read("app/news/page.tsx");

    expect(news).toContain(
      'className="block rounded-[18px] outline-none focus-visible:ring-2'
    );
    expect(news).toContain("sm:rounded-[24px]");
    expect(news).not.toContain('className="block rounded-lg outline-none');
  });

  it("offsets the main anchor below the sticky navigation", () => {
    const layout = read("app/layout.tsx");

    expect(layout).toContain(
      '<main id="main-content" className="scroll-mt-24">'
    );
  });
});
