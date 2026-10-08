import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import gradientStyles from "./SectionGradient.module.css";
import styles from "./SectionBand.module.css";

type SectionTone =
  | "whiteToBlue"
  | "blueToIvory"
  | "ivoryToWhite"
  | "blueToWhite";

type SectionBandProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  as?: "section" | "article";
  children: ReactNode;
  tone: SectionTone;
};

export function SectionBand({
  as: Element = "section",
  children,
  className,
  tone,
  ...props
}: SectionBandProps) {
  return (
    <Element
      className={cn(styles.section, gradientStyles[tone], className)}
      data-section-band={tone}
      {...props}
    >
      {children}
    </Element>
  );
}
