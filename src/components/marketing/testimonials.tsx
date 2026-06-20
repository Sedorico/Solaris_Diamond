import { testimonials } from "@/lib/data/marketing";
import { SectionHeading } from "@/components/section-heading";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { initials } from "@/lib/utils";

export function Testimonials() {
  return (
    <section className="mx-auto mt-32 w-full max-w-6xl px-6">
      <SectionHeading
        eyebrow="Loved by operators"
        title="The calm at the centre of busy businesses"
      />
      <Stagger className="mt-14 grid gap-4 md:grid-cols-2">
        {testimonials.map((t) => (
          <StaggerItem
            key={t.name}
            className="flex h-full flex-col rounded-2xl border border-border bg-card p-7"
          >
            <p className="text-pretty text-lg leading-relaxed text-foreground/90">
              “{t.quote}”
            </p>
            <div className="mt-6 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                {initials(t.name)}
              </span>
              <div>
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
