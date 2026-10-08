import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Hero } from "../components/home/Hero";
import { PlatformSection } from "../components/home/PlatformSection";

describe("legacy homepage panels", () => {
  it("do not reintroduce full-width dark sections", () => {
    const markup = [
      renderToStaticMarkup(<Hero />),
      renderToStaticMarkup(<PlatformSection />)
    ].join("");

    expect(markup).not.toContain("bg-slate-950");
    expect(markup).not.toContain("bg-grid-dark");
    expect(markup).not.toContain("text-white");
  });
});
