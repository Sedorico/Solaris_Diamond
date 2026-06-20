import { SolarisMark } from "@/components/logo";

/** Editorial brand ticker — the wordmark, set in motion. */
export function LogoCloud() {
  const items = Array.from({ length: 8 });
  return (
    <section className="mt-28 border-y border-border py-8">
      <div className="mask-fade-x relative overflow-hidden">
        <div className="flex w-max animate-marquee items-center gap-12">
          {items.concat(items).map((_, i) => (
            <span
              key={i}
              className="font-display flex shrink-0 items-center gap-5 text-3xl font-medium italic text-foreground/55"
            >
              Solaris Diamond
              <SolarisMark className="size-5 not-italic text-accent" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
