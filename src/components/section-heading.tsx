import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/reveal";

interface SectionHeadingProps {
  eyebrow?: string;
  index?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "center" | "left";
  className?: string;
}

export function SectionHeading({
  eyebrow,
  index,
  title,
  description,
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <Reveal
      className={cn(
        "flex flex-col gap-5",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className,
      )}
    >
      {(eyebrow || index) && (
        <div className="flex items-center gap-3">
          {index && <span className="eyebrow text-accent">{index}</span>}
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        </div>
      )}
      <h2 className="font-display max-w-3xl text-balance text-4xl font-medium leading-[1.05] sm:text-5xl md:text-[3.4rem]">
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg",
            align === "center" && "mx-auto",
          )}
        >
          {description}
        </p>
      )}
    </Reveal>
  );
}
