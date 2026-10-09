export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.shoubanrenzheng.com";
export const siteOrigin = new URL(siteUrl).origin;

export const routes = [
  "/",
  "/solutions",
  "/aipr",
  "/services",
  "/trust",
  "/compliance",
  "/news",
  "/about",
  "/contact",
  "/privacy",
  "/disclaimer"
] as const;

export type SiteRoute = (typeof routes)[number];
