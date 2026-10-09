import type { Metadata } from "next";
import { CTASection } from "@/components/common/CTASection";
import { CurvedHero } from "@/components/home/CurvedHero";
import { HomeAiprCapabilities } from "@/components/home/HomeAiprCapabilities";
import { HomeAudienceBand } from "@/components/home/HomeAudienceBand";
import { HomePositioning } from "@/components/home/HomePositioning";
import { HomeProcess } from "@/components/home/HomeProcess";
import { HomeResearch } from "@/components/home/HomeResearch";
import { HomeScenarioStrip } from "@/components/home/HomeScenarioStrip";
import { HomeServiceGrid } from "@/components/home/HomeServiceGrid";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  alternates: {
    canonical: canonicalUrl("/")
  }
};

export default function HomePage() {
  return (
    <>
      <CurvedHero />
      <HomeAudienceBand />
      <HomePositioning />
      <HomeAiprCapabilities />
      <HomeScenarioStrip />
      <HomeServiceGrid />
      <HomeProcess />
      <HomeResearch />
      <CTASection variant="home" />
    </>
  );
}
