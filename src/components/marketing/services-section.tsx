import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { services } from "@/lib/data/services";
import { getIcon } from "@/components/icon-map";
import { EditorialHeading } from "@/components/marketing/editorial-heading";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { formatCurrency } from "@/lib/utils";

export function ServicesSection() {
  return (
    <section id="services" className="mx-auto mt-40 w-full max-w-6xl px-6">
      <EditorialHeading
        roman="iii."
        label="The Services"
        title={
          <>
            Five services.{" "}
            <span className="italic text-gradient-accent">One platform.</span>
          </>
        }
        description="Each module is a complete product in its own right — and unmistakably better together."
      />

      <Stagger className="mt-16 border-t border-border">
        {services.map((service, i) => {
          const Icon = getIcon(service.icon);
          return (
            <StaggerItem key={service.id}>
              <Link
                href={service.href}
                data-cursor-label="View"
                className="group relative grid grid-cols-[auto_1fr_auto] items-center gap-5 border-b border-border py-8 sm:gap-8 sm:py-10"
              >
                {/* Growing left accent bar */}
                <span className="absolute left-0 top-0 h-full w-px origin-top scale-y-0 bg-accent transition-transform duration-500 ease-out group-hover:scale-y-100" />
                {/* Soft hover wash */}
                <span className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-card/0 via-card/50 to-card/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                <span className="font-display pl-4 text-2xl font-normal italic text-muted-foreground/45 transition-colors duration-500 group-hover:text-accent sm:text-3xl">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div className="min-w-0">
                  <h3 className="font-display text-2xl font-normal leading-none tracking-tight transition-transform duration-500 ease-out group-hover:translate-x-2 sm:text-4xl">
                    {service.name}
                  </h3>
                  {/* Tagline + stat reveal — smooth height expand on hover */}
                  <div className="grid grid-rows-[0fr] transition-all duration-500 ease-out group-hover:mt-3 group-hover:grid-rows-[1fr]">
                    <div className="overflow-hidden">
                      <p className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{service.tagline}</span>
                        <span className="hidden h-px w-8 bg-accent/50 sm:inline-block" />
                        <span className="hidden text-accent/80 sm:inline">
                          {service.stat.value} {service.stat.label}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-5 sm:gap-8">
                  <span className="tabular text-right text-sm text-muted-foreground transition-colors duration-500 group-hover:text-foreground sm:text-base">
                    {formatCurrency(service.price)}
                    <span className="text-xs">/mo</span>
                  </span>
                  <span className="relative flex size-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-all duration-500 group-hover:scale-110 group-hover:border-accent group-hover:bg-accent group-hover:text-accent-foreground">
                    <Icon className="size-4 transition-all duration-300 group-hover:scale-0 group-hover:opacity-0" />
                    <ArrowUpRight className="absolute size-4 scale-0 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
                  </span>
                </div>
              </Link>
            </StaggerItem>
          );
        })}
      </Stagger>

      <Reveal className="mt-10">
        <Link
          href="/services"
          className="group inline-flex items-center gap-2 text-sm text-foreground/70 transition-colors hover:text-foreground"
        >
          View all services in detail
          <span className="inline-block h-px w-8 bg-foreground transition-all duration-300 group-hover:w-12 group-hover:bg-accent" />
        </Link>
      </Reveal>
    </section>
  );
}
