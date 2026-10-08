import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PageHero } from "../components/common/PageHero";

describe("PageHero visual style", () => {
  it("uses the scoped light Fluent visual language for inner pages", () => {
    const markup = renderToStaticMarkup(
      <PageHero
        eyebrow="服务产品"
        title="数字人格权资产服务"
        description="用于验证站内通用页头的浅色视觉风格。"
      />
    );

    expect(markup).toContain('data-interior-page-hero="true"');
    expect(markup).not.toContain("data-fluent-surface");
    expect(markup).toContain("text-[#0b132b]");
    expect(markup).not.toContain("bg-slate-950");
    expect(markup).not.toContain("bg-grid-light");
    expect(markup).not.toContain("bg-grid-dark");
    expect(markup).not.toContain("text-white");
  });
});
