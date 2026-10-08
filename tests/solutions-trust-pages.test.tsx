import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SolutionsPage from "../app/solutions/page";
import TrustPage from "../app/trust/page";
import { Footer } from "../components/layout/Footer";
import { solutions, solutionsIntro } from "../content/solutions";
import {
  trustBoundaries,
  trustIntro,
  trustTopics
} from "../content/trust";

describe("solutions and trust pages", () => {
  it("renders a real solutions page with one primary heading", () => {
    const markup = renderToStaticMarkup(<SolutionsPage />);

    expect(markup.match(/<h1/g)).toHaveLength(1);
    solutions.forEach((solution) => {
      expect(markup).toContain(solution.title);
      expect(markup).toContain(solution.audience);
    });
  });

  it("renders a trust page with explicit public boundaries", () => {
    const markup = renderToStaticMarkup(<TrustPage />);

    expect(markup.match(/<h1/g)).toHaveLength(1);
    trustTopics.forEach((topic) => expect(markup).toContain(topic.title));
    trustBoundaries.forEach((boundary) =>
      expect(markup).toContain(boundary)
    );
    expect(markup).toContain("bg-[#edf3ff]");
    expect(markup).not.toContain('<section class="bg-slate-950');
    expect(markup).not.toContain(
      '<section class="bg-slate-950 py-16 text-white'
    );
  });

  it("keeps both grouped secondary destinations in the footer", () => {
    const markup = renderToStaticMarkup(<Footer />);

    ["/solutions", "/trust", "/news", "/contact"].forEach((href) => {
      expect(markup).toContain(`href="${href}"`);
    });
  });

  it("avoids unverified absolute claims in new public content", () => {
    const publicContent = [
      JSON.stringify({
        solutionsIntro,
        solutions,
        trustIntro,
        trustTopics,
        trustBoundaries
      }),
      renderToStaticMarkup(<SolutionsPage />),
      renderToStaticMarkup(<TrustPage />)
    ].join("\n");

    expect(publicContent).not.toMatch(
      /100%|权威确权|司法级|全网覆盖|绝对安全|行业领先|保证结果/
    );
  });
});
