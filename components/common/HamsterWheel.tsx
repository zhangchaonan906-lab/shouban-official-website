import styles from "./HamsterWheel.module.css";

export function HamsterWheel() {
  return (
    <div
      className={styles.root}
      aria-hidden="true"
      data-hamster-wheel="true"
    >
      <div className={styles.wheel} data-part="wheel" />
      <div className={styles.hamster} data-part="hamster">
        <div className={styles.body} data-part="body">
          <div className={styles.head} data-part="head">
            <div className={styles.ear} data-part="ear" />
            <div className={styles.eye} data-part="eye" />
            <div className={styles.nose} data-part="nose" />
          </div>
          <div
            className={`${styles.limb} ${styles.frontRight}`}
            data-part="limb"
          />
          <div
            className={`${styles.limb} ${styles.frontLeft}`}
            data-part="limb"
          />
          <div
            className={`${styles.limb} ${styles.backRight}`}
            data-part="limb"
          />
          <div
            className={`${styles.limb} ${styles.backLeft}`}
            data-part="limb"
          />
          <div className={styles.tail} data-part="tail" />
        </div>
      </div>
      <div className={styles.spoke} data-part="spoke" />
    </div>
  );
}
