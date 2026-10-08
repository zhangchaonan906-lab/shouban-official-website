import Image from "next/image";

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
      <video
        className="footer-video-media__video"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/images/home/home-growth-cta-poster.jpg"
        tabIndex={-1}
      >
        <source src="/video/home-growth-cta.mp4" type="video/mp4" />
      </video>
      <span className="footer-video-media__wash" />
    </div>
  );
}
