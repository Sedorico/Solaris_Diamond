import type { Metadata } from "next";
import { PageHeader } from "@/components/marketing/page-header";
import { ServicesSection } from "@/components/marketing/services-section";
import { CtaSection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Explore the five Solaris Diamond services — inventory, sales, expenses, point of sale and attendance.",
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
      <ServicesSection />
      <CtaSection />
      <div className="h-10" />
    </>
  );
}
