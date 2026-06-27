import type { Metadata } from "next";
import { PageHeader } from "@/components/marketing/page-header";
import { ServiceCard } from "@/components/marketing/service-card";
import { CtaSection } from "@/components/marketing/cta-section";
import { services } from "@/lib/data/services";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Explore the five Solaris Diamond services in full — inventory, sales, expenses, point of sale and attendance — with everything each plan includes.",
};

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Services"
        title={
          <>
            Powerful modules,{" "}
            <span className="text-gradient-accent">beautifully unified</span>
          </>
        }
        description="Every Solaris service is a complete, production-grade product. Subscribe to one or combine them — they work flawlessly together."
      />

      <section className="mx-auto mt-12 w-full max-w-6xl px-6">
        <div className="flex flex-col gap-6">
          {services.map((service, i) => (
            <ServiceCard key={service.id} service={service} index={i} />
          ))}
        </div>
      </section>

      <CtaSection />
      <div className="h-10" />
    </>
  );
}
