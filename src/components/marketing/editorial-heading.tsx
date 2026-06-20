import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/reveal";

/**
 * Editorial section header — the shared chapter-mark language used across the
 * homepage (a serif Roman numeral + mono label + hairline, then a display
 * title and optional description). Keeps every section below the hero in the
 * same luxury register.
 */
interface EditorialHeadingProps {
  roman: string; // e.g. "iii."
  label: string; // e.g. "The Services"
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}

export function EditorialHeading({
  roman,
  label,
  title,
  description,
  align = "left",
  className,
}: EditorialHeadingProps) {
  const centered = align === "center";
  return (
    <Reveal
      className={cn(
        "flex flex-col",
        centered ? "items-center text-center" : "items-start text-left",
        className,
      )}
    >
      <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
        {centered && <span className="h-px w-12 bg-accent/40" />}
        <span className="font-display text-2xl font-normal italic text-accent">
          {roman}
        </span>
        <span>{label}</span>
        <span className="h-px w-12 bg-accent/40" />
      </div>

      <h2 className="font-display mt-8 max-w-3xl text-balance text-4xl font-normal leading-[1.05] tracking-[-0.01em] sm:text-5xl md:text-[3.4rem]">
        {title}
      </h2>

      {description && (
        <p
          className={cn(
            "mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg",
            centered && "mx-auto",
          )}
        >
          {description}
        </p>
      )}
    </Reveal>
  );
}
