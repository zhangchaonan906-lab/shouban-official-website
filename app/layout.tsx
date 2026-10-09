import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { company } from "@/content/company";
import { canonicalUrl } from "@/lib/seo";
import { siteOrigin } from "@/lib/constants";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: company.seoTitle,
    template: `%s｜${company.name}`
  },
  description: company.seoDescription,
  keywords: [...company.keywords],
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }]
  },
  openGraph: {
    title: company.seoTitle,
    description: company.seoDescription,
    siteName: company.name,
    locale: "zh_CN",
    type: "website",
    images: ["/images/shouban-hero.png"],
    url: canonicalUrl("/")
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B132B"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <a
          href="#main-content"
          className="skip-link fixed left-4 top-3 z-[100] -translate-y-20 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
        >
          跳到正文
        </a>
        <Navbar />
        <main id="main-content" className="scroll-mt-24">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
