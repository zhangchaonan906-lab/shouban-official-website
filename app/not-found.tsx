import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/common/Container";
import surfaceStyles from "@/components/common/FluentSurface.module.css";
import { HamsterWheel } from "@/components/common/HamsterWheel";
import { InteriorPageFrame } from "@/components/common/InteriorPageFrame";
import { SectionBand } from "@/components/common/SectionBand";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "页面未找到",
  robots: { index: false, follow: true }
};

export default function NotFound() {
  return (
    <InteriorPageFrame>
      <SectionBand tone="blueToWhite" className="min-h-[calc(100svh-4rem)]">
        <Container>
          <div
            className={`${surfaceStyles.elevated} mx-auto max-w-3xl px-6 py-10 text-center sm:px-10 sm:py-12`}
            data-fluent-surface="elevated"
          >
            <HamsterWheel />
            <p className="text-sm font-semibold text-[#3347b8]">404</p>
            <h1 className="mt-4 text-4xl font-semibold text-[#0b132b]">
              页面未找到
            </h1>
            <p className="mt-4 text-base leading-8 text-[#6b7280]">
              小仓鼠跑错路了。当前页面可能已移动或暂未开放，请返回首页继续浏览。
            </p>
            <Link
              href="/"
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-8 rounded-[14px]"
              )}
            >
              返回首页
            </Link>
          </div>
        </Container>
      </SectionBand>
    </InteriorPageFrame>
  );
}
