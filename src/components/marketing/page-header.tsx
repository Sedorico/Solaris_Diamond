import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  className,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={cn("mx-auto w-full max-w-6xl px-6 pt-40 sm:pt-48", className)}>
      {eyebrow && (
        <Reveal>
          <span className="eyebrow">{eyebrow}</span>
        </Reveal>
      )}
      <Reveal delay={0.06} className="mt-6">
        <h1 className="font-display max-w-4xl text-balance text-5xl font-medium leading-[1.02] sm:text-6xl md:text-[5rem]">
          {title}
        </h1>
      </Reveal>
      {description && (
        <Reveal delay={0.12}>
          <p className="mt-7 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            {description}
          </p>
        </Reveal>
      )}
      {children && (
        <Reveal delay={0.16}>
          <div className="mt-8">{children}</div>
        </Reveal>
      )}
      <div className="mt-14 h-px w-full bg-border" />
    </section>
  );
}
