import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, ArrowLeft } from "lucide-react";
import { services, serviceMap, type ServiceId } from "@/lib/data/services";
import { bundles } from "@/lib/data/bundles";
import { getIcon } from "@/components/icon-map";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { formatCurrency } from "@/lib/utils";

export function generateStaticParams() {
  return services.map((s) => ({ id: s.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const service = serviceMap[id as ServiceId];
  if (!service) return { title: "Service" };
  return { title: service.name, description: service.description };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = serviceMap[id as ServiceId];
  if (!service) notFound();

  const Icon = getIcon(service.icon);
  const inBundles = bundles.filter((b) => b.services.includes(service.id));

  return (
    <div className="mx-auto w-full max-w-5xl px-6 pt-36 sm:pt-44">
      <Reveal>
        <Link
          href="/services"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> All services
        </Link>
      </Reveal>

      {/* Pricing card */}
      <Reveal delay={0.05} className="mt-8">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-premium">
          <div className="grid lg:grid-cols-2">
            {/* Left — plan + price (centered, reference-style) */}
            <div className="flex flex-col items-center justify-center p-10 text-center sm:p-14">
              <span className="flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Icon className="size-6" />
              </span>

              <h1 className="font-display mt-6 text-3xl font-medium sm:text-[2.1rem]">
                {service.name}
              </h1>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                {service.tagline}
              </p>

              <div className="mt-9 flex items-end gap-1.5">
                <span className="font-display text-6xl font-medium tabular sm:text-7xl">
                  {formatCurrency(service.price)}
                </span>
                <span className="mb-2.5 text-sm text-muted-foreground">/mo</span>
              </div>

              <div className="mt-8 flex w-full max-w-xs flex-col gap-2.5">
                <Button asChild size="lg" variant="accent" className="w-full">
                  <Link href={`/checkout?service=${service.id}`}>
                    Get started <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full">
                  <Link href="/pricing">Compare plans</Link>
                </Button>
              </div>

              <p className="mt-9 max-w-xs text-xs leading-relaxed text-muted-foreground">
                Includes everything listed, automatic updates and support. No
                setup fees · activates instantly · cancel anytime.
              </p>
            </div>

            {/* Right — checklist */}
            <div className="flex flex-col justify-center border-t border-border bg-secondary/30 p-10 sm:p-14 lg:border-l lg:border-t-0">
              <span className="eyebrow">What&apos;s included</span>
              <ul className="mt-6 flex flex-col gap-4">
                {service.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-[15px]">
                    <Check className="size-4 shrink-0 text-accent" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>

              <p className="mt-8 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Subscribe to just this module, or save with a bundle. Every plan
                is multi-tenant isolated and secured to bank-grade standards.
              </p>

              <div className="mt-8">
                <span className="eyebrow">Also part of</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {inBundles.map((b) => (
                    <Link key={b.id} href={`/bundles#${b.id}`}>
                      <Badge variant="outline" className="cursor-pointer hover:border-accent/50">
                        {b.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stat strip */}
          <div className="flex items-center justify-between gap-4 border-t border-border px-10 py-5 sm:px-14">
            <span className="eyebrow">{service.stat.label}</span>
            <span className="font-display text-xl font-medium text-gradient-accent">
              {service.stat.value}
            </span>
          </div>
        </div>
      </Reveal>

      {/* Everything you can do */}
      <div className="mt-24">
        <Reveal>
          <span className="eyebrow">Capabilities</span>
          <h2 className="font-display mt-4 text-3xl font-medium tracking-tight">
            Everything you can do
          </h2>
        </Reveal>
        <Stagger className="mt-10 grid gap-4 sm:grid-cols-2">
          {service.capabilities.map((cap) => (
            <StaggerItem
              key={cap.title}
              className="flex gap-4 rounded-lg border border-border bg-card p-6"
            >
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Check className="size-3.5" strokeWidth={3} />
              </span>
              <div>
                <h3 className="font-medium">{cap.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {cap.description}
                </p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>

      {/* Pairs perfectly with */}
      <div className="mb-24 mt-24">
        <Reveal>
          <span className="eyebrow">Better together</span>
          <h2 className="font-display mt-4 text-3xl font-medium tracking-tight">
            Pairs perfectly with
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services
            .filter((s) => s.id !== service.id)
            .map((s) => {
              const OtherIcon = getIcon(s.icon);
              return (
                <Link
                  key={s.id}
                  href={s.href}
                  className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-colors hover:border-accent/40"
                >
                  <span className="flex size-10 items-center justify-center rounded-lg border border-border text-foreground/80 transition-colors group-hover:text-accent">
                    <OtherIcon className="size-5" />
                  </span>
                  <span className="text-sm font-medium">{s.name}</span>
                  <span className="tabular text-xs text-muted-foreground">
                    {formatCurrency(s.price)}/mo
                  </span>
                </Link>
              );
            })}
        </div>
      </div>
    </div>
  );
}
