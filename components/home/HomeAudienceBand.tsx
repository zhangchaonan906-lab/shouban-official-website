import Image from "next/image";
import gradientStyles from "@/components/common/SectionGradient.module.css";
import styles from "./HomeAudienceBand.module.css";

const partnerLogos = [
  {
    name: "百度网盘",
    src: "/images/home/partners/baidu-netdisk.png",
    width: 137,
    height: 134,
  },
  {
    name: "百度文库",
    src: "/images/home/partners/baidu-wenku.png",
    width: 233,
    height: 87,
  },
  {
    name: "第一视频",
    src: "/images/home/partners/first-video.png",
    width: 148,
    height: 115,
  },
  {
    name: "Wemade",
    src: "/images/home/partners/wemade.png",
    width: 187,
    height: 90,
  },
  {
    name: "视觉中国",
    src: "/images/home/partners/visual-china.png",
    width: 260,
    height: 133,
  },
  {
    name: "方正集团",
    src: "/images/home/partners/founder.png",
    width: 207,
    height: 67,
  },
  {
    name: "腾讯视频",
    src: "/images/home/partners/tencent-video.png",
    width: 230,
    height: 88,
  },
  {
    name: "京东",
    src: "/images/home/partners/jd.png",
    width: 176,
    height: 115,
  },
  {
    name: "快手",
    src: "/images/home/partners/kuaishou.png",
    width: 171,
    height: 93,
  },
  {
    name: "新片场",
    src: "/images/home/partners/xinpianchang.png",
    width: 192,
    height: 68,
  },
  {
    name: "学科网",
    src: "/images/home/partners/zxxk.png",
    width: 185,
    height: 73,
  },
  {
    name: "优酷",
    src: "/images/home/partners/youku.png",
    width: 127,
    height: 109,
  },
] as const;

const partnerTickerCopyIndexes = [0, 1, 2, 3] as const;

export function HomeAudienceBand() {
  return (
    <section
      className={`${styles.band} ${gradientStyles.horizonToBlue}`}
      data-home-audience-band="true"
      aria-label="合作伙伴"
    >
      <div className={styles.inner}>
        <p className={styles.label}>合作伙伴</p>
        <div className={styles.viewport}>
          <div
            id="home-partner-logo-track"
            className={styles.track}
            data-home-partner-track
          >
            {partnerTickerCopyIndexes.map((copyIndex) => {
              const repeated = copyIndex !== 0;

              return (
                <div
                  key={copyIndex}
                  className={
                    repeated
                      ? `${styles.group} ${styles.repeatedGroup}`
                      : styles.group
                  }
                  data-home-partner-group
                  aria-hidden={repeated ? "true" : undefined}
                >
                  {partnerLogos.map((partner) => (
                    <span className={styles.logoSlot} key={partner.name}>
                      <Image
                        className={styles.logo}
                        src={partner.src}
                        width={partner.width}
                        height={partner.height}
                        sizes="140px"
                        alt={repeated ? "" : partner.name}
                        loading="lazy"
                        draggable={false}
                      />
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
