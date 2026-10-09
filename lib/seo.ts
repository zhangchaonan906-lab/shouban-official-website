import type { Metadata } from "next";
import { company } from "@/content/company";
import { siteOrigin } from "@/lib/constants";

export function canonicalUrl(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0] ?? "";
  const normalizedPath = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;
  const url = new URL(normalizedPath === "/" ? "/" : normalizedPath, `${siteOrigin}/`);

  url.search = "";
  url.hash = "";

  return url.href;
}

export function createPageMetadata(
  title: string,
  description: string,
  pathname: string
): Metadata {
  const canonical = canonicalUrl(pathname);

  return {
    title,
    description,
    keywords: [...company.keywords],
    alternates: {
      canonical
    },
    openGraph: {
      title: `${title}｜${company.name}`,
      description,
      siteName: company.name,
      locale: "zh_CN",
      type: "website",
      url: canonical
    }
  };
}
