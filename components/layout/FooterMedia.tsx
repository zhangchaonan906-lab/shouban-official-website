import Image from "next/image";
import { DeferredFooterVideo } from "./DeferredFooterVideo";

export function FooterMedia() {
  return (
    <div className="footer-video-media" aria-hidden="true">
      <Image
        src="/images/home/home-growth-cta-poster.jpg"
        alt=""
        fill
        sizes="100vw"
        className="footer-video-media__poster"
      />
      <DeferredFooterVideo
        className="footer-video-media__video"
        src="/video/home-growth-cta.mp4"
        poster="/images/home/home-growth-cta-poster.jpg"
      />
      <span className="footer-video-media__wash" />
    </div>
  );
}
