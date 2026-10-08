import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import surfaceStyles from "./FluentSurface.module.css";

type FeatureCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  points?: readonly string[];
  className?: string;
};

export function FeatureCard({ title, description, icon: Icon, points, className }: FeatureCardProps) {
  return (
    <article
      data-fluent-surface="standard"
      className={cn(
        surfaceStyles.standard,
        "h-full p-6 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-[2px] hover:border-[rgba(51,71,184,0.26)] hover:shadow-[var(--sb-shadow-elevated)]",
        className
      )}
    >
      <div className={cn(surfaceStyles.icon, "flex h-11 w-11 items-center justify-center text-[#3347b8]")}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="mt-5 text-xl font-semibold text-[#0b132b]">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-[rgba(11,19,43,0.68)]">{description}</p>
      {points ? (
        <ul className="mt-5 space-y-2 text-sm text-[rgba(11,19,43,0.68)]">
          {points.map((point) => (
            <li key={point} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-[#3347b8]" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
