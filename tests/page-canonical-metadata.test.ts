import { describe, expect, it } from "vitest";
import { metadata as aboutMetadata } from "@/app/about/page";
import { metadata as aiprMetadata } from "@/app/aipr/page";
import { metadata as complianceMetadata } from "@/app/compliance/page";
import { metadata as contactMetadata } from "@/app/contact/page";
import { metadata as disclaimerMetadata } from "@/app/disclaimer/page";
import { metadata as homeMetadata } from "@/app/page";
import { metadata as newsMetadata } from "@/app/news/page";
import { metadata as notFoundMetadata } from "@/app/not-found";
import { metadata as servicesMetadata } from "@/app/services/page";
import { metadata as solutionsMetadata } from "@/app/solutions/page";
import { metadata as trustMetadata } from "@/app/trust/page";
import { metadata as layoutMetadata } from "@/app/layout";
import { canonicalUrl } from "@/lib/seo";

const staticPageMetadata = [
  ["/", homeMetadata],
  ["/about", aboutMetadata],
  ["/aipr", aiprMetadata],
  ["/compliance", complianceMetadata],
  ["/contact", contactMetadata],
  ["/disclaimer", disclaimerMetadata],
  ["/news", newsMetadata],
  ["/services", servicesMetadata],
  ["/solutions", solutionsMetadata],
  ["/trust", trustMetadata]
] as const;

describe("static page canonical metadata", () => {
  it.each(staticPageMetadata)("uses %s as its canonical URL", (pathname, metadata) => {
    expect(metadata.alternates?.canonical).toBe(canonicalUrl(pathname));
  });

  it("uses the same site origin for metadataBase and the homepage Open Graph URL", () => {
    expect(layoutMetadata.metadataBase?.toString()).toBe(
      new URL(canonicalUrl("/")).origin + "/"
    );
    expect(layoutMetadata.openGraph?.url).toBe(canonicalUrl("/"));
  });

  it("keeps the not-found page out of the index without assigning a canonical", () => {
    expect(notFoundMetadata.robots).toEqual({ index: false, follow: true });
    expect(notFoundMetadata.alternates?.canonical).toBeUndefined();
  });
});
