import type { ReactNode } from "react";
import styles from "./InteriorPageFrame.module.css";

type InteriorPageFrameProps = {
  children: ReactNode;
};

export function InteriorPageFrame({ children }: InteriorPageFrameProps) {
  return (
    <div className={styles.page} data-interior-fluent="true">
      {children}
    </div>
  );
}
