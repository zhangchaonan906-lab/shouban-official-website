import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/common/Container";
import { buttonVariants } from "@/components/ui/button";
import { heroSlides } from "@/content/home";
import { cn } from "@/lib/utils";

const hero = heroSlides[0];

export function HomeVideoHero() {
  return (
    <section
      className="home-video-hero text-slate-950"
      aria-labelledby="home-video-hero-title"
    >
      <Image
        src="/images/home/home-growth-cta-poster.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="home-video-hero__poster"
        aria-hidden="true"
      />
      <video
        className="home-video-hero__video"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/images/home/home-growth-cta-poster.jpg"
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src="/video/home-growth-cta.mp4" type="video/mp4" />
      </video>
      <span className="home-video-hero__wash" aria-hidden="true" />

      <Container className="home-video-hero__content">
        <div className="home-video-hero__copy">
          <p className="text-sm font-semibold text-sky-800 sm:text-base">
            {hero.eyebrow}
          </p>
          <h1
            id="home-video-hero-title"
            className="mt-5 max-w-[680px] text-balance text-4xl font-semibold leading-[1.12] tracking-normal text-slate-950 sm:text-5xl lg:text-[3.35rem]"
          >
            {hero.title}
          </h1>
          <p className="mt-6 max-w-[560px] text-base leading-8 text-slate-700 sm:text-lg sm:leading-9">
            {hero.description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={hero.primaryAction.href}
              className={cn(
                buttonVariants({ variant: "primary", size: "lg" }),
                "w-full sm:w-auto"
              )}
            >
              {hero.primaryAction.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={hero.secondaryAction.href}
              className={cn(
                buttonVariants({ variant: "secondary", size: "lg" }),
                "w-full border-slate-300 bg-white/90 sm:w-auto"
              )}
            >
              {hero.secondaryAction.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
