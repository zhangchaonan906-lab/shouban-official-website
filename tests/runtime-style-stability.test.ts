import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("runtime style stability", () => {
  it("uses the stable webpack compiler for local development", () => {
    const packageJson = JSON.parse(read("package.json")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.dev).toMatch(
      /^next dev\b.*(?:^|\s)--webpack(?:\s|$)/
    );
  });

  it("never applies the view-timeline reveal animation to whole section surfaces", () => {
    const root = postcss.parse(read("app/globals.css"));
    const animatedSelectors: string[] = [];

    root.walkAtRules("supports", (supportsRule) => {
      if (!supportsRule.params.includes("animation-timeline: view()")) {
        return;
      }

      supportsRule.walkRules((rule) => {
        const ownsTimeline = rule.nodes.some(
          (node) =>
            node.type === "decl" && node.prop === "animation-timeline"
        );

        if (ownsTimeline) {
          animatedSelectors.push(...rule.selectors);
        }
      });
    });

    expect(animatedSelectors).toContain(".scroll-reveal:not(section)");
    expect(animatedSelectors).not.toContain(".scroll-reveal");
  });
});
