import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  tone?: "light" | "dark";
  className?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  tone = "light",
  className
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      {eyebrow ? (
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-normal",
            tone === "dark" ? "text-sky-300" : "text-[#3347b8]"
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={cn(
          "mt-4 text-balance text-3xl font-semibold leading-tight sm:text-4xl",
          tone === "dark" ? "text-white" : "text-[#0b132b]"
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-4 text-base leading-8 sm:text-lg",
            tone === "dark"
              ? "text-slate-300"
              : "text-[rgba(11,19,43,0.68)]"
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
