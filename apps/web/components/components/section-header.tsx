import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  align?: "left" | "center";
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
}: SectionHeaderProps) {
  const centered = align === "center";

  return (
    <div className={cn("max-w-3xl", centered && "mx-auto text-center")}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-white/46 sm:text-xs">
        {eyebrow}
      </p>
      <h2 className="mt-4 font-display text-4xl uppercase leading-[0.94] text-white sm:text-5xl lg:text-[4.25rem]">
        {title}
      </h2>
      <p className="mt-5 max-w-2xl text-base leading-7 text-[color:var(--muted-foreground)] sm:text-lg">
        {description}
      </p>
    </div>
  );
}
