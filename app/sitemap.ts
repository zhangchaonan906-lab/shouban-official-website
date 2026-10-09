import type { MetadataRoute } from "next";
import { researchItems } from "@/content/research";
import { routes } from "@/lib/constants";
import { canonicalUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = routes.map((route) => ({
    url: canonicalUrl(route),
    changeFrequency: route === "/" ? ("weekly" as const) : ("monthly" as const),
    priority: route === "/" ? 1 : 0.7
  }));

  const researchRoutes = researchItems.map((item) => ({
    url: canonicalUrl(`/news/${item.slug}`),
    changeFrequency: "monthly" as const,
    priority: 0.6
  }));

  return [...staticRoutes, ...researchRoutes];
}
