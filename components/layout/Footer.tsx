import Link from "next/link";
import { company, navigationItems } from "@/content/company";
import { secondaryNavigation } from "@/content/navigation";
import { BrandMark } from "@/components/brand/BrandMark";
import { Container } from "@/components/common/Container";
import { FooterMedia } from "@/components/layout/FooterMedia";

const legalLinks = [
  { label: "隐私政策", href: "/privacy" },
  { label: "免责声明", href: "/disclaimer" }
];

const businessLinks = [
  { label: "角色与场景解决方案", href: "/solutions" },
  { label: "数字人格权资产认证", href: "/services" },
  { label: "AIGC侵权监测", href: "/services" },
  { label: "证据固定与维权协同", href: "/services" },
  { label: "授权合规管理", href: "/services" },
  { label: "星眸AIPR", href: "/aipr" },
  { label: "技术与可信边界", href: "/trust" },
  { label: "AIGC合规", href: "/compliance" }
];

const footerNavigation = [...navigationItems, ...secondaryNavigation];

const footerKeywords = ["认证", "确权", "监测", "维权", "授权", "AIGC合规", "数字人格权资产"];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#f8fbff]">
      <FooterMedia />
      <Container className="relative z-10 pt-8 pb-5">
        <div className="w-full">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1.25fr_0.95fr]">
            <section aria-labelledby="footer-company-heading">
              <div className="flex items-center gap-3">
                <BrandMark size={40} />
                <div>
                  <h2 id="footer-company-heading" className="font-semibold text-slate-950">
                    {company.name}
                  </h2>
                  <p className="text-sm text-slate-500">{company.tagline}</p>
                </div>
              </div>
              <p className="mt-3 max-w-sm text-[13px] leading-6 text-slate-600">{company.description}</p>
            </section>

          <div className="grid gap-5 sm:grid-cols-2">
            <section aria-labelledby="footer-navigation-heading">
              <h2 id="footer-navigation-heading" className="text-sm font-semibold text-slate-950">
                网站导航
              </h2>
              <nav aria-label="页脚导航" className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] text-slate-600">
                {footerNavigation.map((item) => (
                  <Link key={item.href} href={item.href} className="transition-colors hover:text-slate-950">
                    {item.label}
                  </Link>
                ))}
              </nav>
            </section>

            <section aria-labelledby="footer-legal-heading">
              <h2 id="footer-legal-heading" className="text-sm font-semibold text-slate-950">
                法律信息
              </h2>
              <div className="mt-3 grid gap-2 text-[13px] text-slate-600">
                {legalLinks.map((item) => (
                  <Link key={item.href} href={item.href} className="transition-colors hover:text-slate-950">
                    {item.label}
                  </Link>
                ))}
              </div>
            </section>
          </div>

            <section aria-labelledby="footer-contact-heading">
              <h2 id="footer-contact-heading" className="text-sm font-semibold text-slate-950">
                联系信息
              </h2>
              <dl className="mt-3 space-y-2 text-[13px] text-slate-600">
                <div className="grid grid-cols-[3.75rem_1fr] gap-3">
                  <dt>电话</dt>
                  <dd className="min-w-0 break-words text-slate-700">{company.contact.phone}</dd>
                </div>
                <div className="grid grid-cols-[3.75rem_1fr] gap-3">
                  <dt>邮箱</dt>
                  <dd className="min-w-0 break-words text-slate-700">{company.contact.email}</dd>
                </div>
                <div className="grid grid-cols-[3.75rem_1fr] gap-3">
                  <dt>地址</dt>
                  <dd className="min-w-0 break-words text-slate-700">{company.contact.address}</dd>
                </div>
                <div className="grid grid-cols-[3.75rem_1fr] gap-3">
                  <dt>备案号</dt>
                  <dd className="min-w-0 break-words text-slate-700">{company.contact.recordNumber}</dd>
                </div>
              </dl>
            </section>
          </div>

          <section aria-labelledby="footer-business-heading" className="mt-10">
            <h2 id="footer-business-heading" className="text-[13px] font-semibold text-slate-950">
              业务链接
            </h2>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-slate-600">
              {businessLinks.map((item) => (
                <Link key={item.label} href={item.href} className="transition-colors hover:text-slate-950">
                  {item.label}
                </Link>
              ))}
            </div>
          </section>

          <div className="mt-9 text-[11px] text-slate-500">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span>© 2026 {company.name}</span>
              <span>All rights reserved</span>
              <span>备案号：{company.contact.recordNumber}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-slate-600">
              {footerKeywords.map((keyword) => (
                <span key={keyword}>{keyword}</span>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
}
