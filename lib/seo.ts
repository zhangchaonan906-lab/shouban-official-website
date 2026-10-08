import type { Metadata } from "next";
import { company } from "@/content/company";

export function createPageMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    keywords: [...company.keywords],
    openGraph: {
      title: `${title}｜${company.name}`,
      description,
      siteName: company.name,
      locale: "zh_CN",
      type: "website"
    }
  };
}
