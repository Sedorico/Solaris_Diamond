import type { Metadata } from "next";
import { PageHeader } from "@/components/marketing/page-header";
import { EditorialHeading } from "@/components/marketing/editorial-heading";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { AnimatedCounter } from "@/components/motion/animated-counter";
import { CtaSection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "About",
  description:
    "Solaris Diamond is on a mission to give every business enterprise-grade software that feels effortless.",
};

const principles = [
  {
    no: "01",
    tag: "Craft",
    title: "Obsessive craft",
    body: "Every pixel, transition and millisecond is considered. Software for your business should feel as refined as the products you admire most.",
  },
  {
    no: "02",
    tag: "Clarity",
    title: "Radical simplicity",
    body: "Powerful does not have to mean complicated. We remove until only the essential remains — then we polish it.",
  },
  {
    no: "03",
    tag: "Trust",
    title: "Trust by design",
    body: "Your data is isolated, encrypted and yours. We build security and privacy into the foundation, never as an afterthought.",
  },
  {
    no: "04",
    tag: "Fairness",
    title: "Fair, transparent pricing",
    body: "Pay for what you use, upgrade when you grow, and never get locked in. No surprises, no hidden fees, ever.",
  },
];

const stats = [
  { value: 5, suffix: "", label: "Core modules" },
  { value: 3, suffix: "", label: "Bundles" },
  { value: 4, suffix: "", label: "Payment methods" },
  { value: 99.99, suffix: "%", label: "Uptime target", decimals: 2 },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="Our story"
        title={
          <>
            Built for businesses that{" "}
            <span className="text-gradient-accent">refuse to settle</span>
          </>
        }
        description="We started Solaris Diamond because running a business shouldn't require a dozen disconnected tools and an IT department. It should feel calm, clear and even beautiful."
      />

      {/* ── i. The Mission ───────────────────────────────────── */}
      <section className="mx-auto mt-32 w-full max-w-6xl px-6">
        <EditorialHeading
          roman="i."
          label="The Mission"
          title={
            <>
              Premium software,{" "}
              <span className="italic text-gradient-accent">for everyone</span>.
            </>
          }
        />

        <div className="mt-12 grid gap-12 md:grid-cols-12">
          <Reveal className="md:col-span-5">
            <blockquote className="border-l-2 border-accent pl-7">
              <p
                className="font-display text-balance text-2xl font-normal leading-snug text-foreground sm:text-[1.75rem]"
                style={{ letterSpacing: "-0.01em" }}
              >
                &ldquo;The best businesses obsess over their customers. We obsess
                over the businesses.&rdquo;
              </p>
              <footer className="mt-5 font-mono text-[10px] tracking-[0.32em] text-muted-foreground uppercase">
                Solaris Diamond — founding principle
              </footer>
            </blockquote>
          </Reveal>

          <Reveal
            delay={0.06}
            className="font-display flex flex-col gap-6 text-pretty text-xl font-normal leading-relaxed text-muted-foreground md:col-span-6 md:col-start-7"
          >
            <p>
              Solaris Diamond brings inventory, sales, expenses, point of sale
              and attendance into one elegant platform — so you can spend less
              time wrangling software and more time growing.
            </p>
            <p>
              We believe premium software shouldn&apos;t be reserved for
              companies with enormous budgets. Whether you run a single store or
              a fast-growing chain, you deserve tools that are fast, secure and
              genuinely a joy to use.
            </p>
          </Reveal>
        </div>

        {/* ── Stats — editorial ruled row (matches the homepage) ── */}
        <Stagger className="mt-24 grid grid-cols-2 divide-x divide-y divide-border border-y border-border sm:grid-cols-4 sm:divide-y-0">
          {stats.map((s) => (
            <StaggerItem
              key={s.label}
              className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center"
            >
              <p className="font-display text-5xl font-normal tracking-tight sm:text-6xl">
                <AnimatedCounter
                  value={s.value}
                  suffix={s.suffix}
                  decimals={s.decimals ?? 0}
                />
              </p>
              <p className="eyebrow">{s.label}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* ── ii. About ────────────────────────────────────────── */}
      <section className="mx-auto mt-40 w-full max-w-6xl px-6">
        <EditorialHeading
          roman="ii."
          label="About"
          title={
            <>
              The values behind{" "}
              <span className="italic text-gradient-accent">every decision</span>.
            </>
          }
          description="Four beliefs that shape how we design, build and support Solaris Diamond."
        />

        <Stagger className="mt-16 border-t border-border">
          {principles.map((p) => (
            <StaggerItem key={p.no}>
              <div className="group grid grid-cols-12 items-baseline gap-4 border-b border-border py-10 transition-colors duration-500 hover:bg-card/40 sm:py-12">
                <span className="font-display col-span-12 text-3xl font-normal italic text-muted-foreground/45 transition-colors duration-500 group-hover:text-accent sm:col-span-2 sm:text-4xl">
                  {p.no}
                </span>

                <div className="col-span-12 sm:col-span-7 sm:col-start-3">
                  <h3 className="font-display text-2xl font-normal leading-snug sm:text-3xl">
                    {p.title}
                  </h3>
                  <span className="mt-3 block h-px w-0 bg-accent transition-all duration-700 ease-out group-hover:w-16" />
                  <p className="mt-4 max-w-md text-pretty leading-relaxed text-muted-foreground">
                    {p.body}
                  </p>
                </div>

                <span className="col-span-12 font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground/70 sm:col-span-2 sm:col-start-11 sm:text-right">
                  {p.tag}
                </span>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <div className="h-24 sm:h-32" />
      <CtaSection />
      <div className="h-10" />
    </>
  );
}
