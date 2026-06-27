import { Hero } from "@/components/marketing/hero";
import { LogoCloud } from "@/components/marketing/logo-cloud";
import { ValueProps } from "@/components/marketing/value-props";
import { ServicesSection } from "@/components/marketing/services-section";
import { BundlesSection } from "@/components/marketing/bundles-section";
import { PaymentShowcase } from "@/components/marketing/payment-showcase";
import { Faq } from "@/components/marketing/faq";
import { CtaSection } from "@/components/marketing/cta-section";

export default function HomePage() {
  return (
    <>
      <Hero />
      <LogoCloud />
      <ValueProps />
      <ServicesSection />
      <BundlesSection />
      <PaymentShowcase />
      <Faq />
      <div className="h-24 sm:h-32" />
      <CtaSection />
    </>
  );
}
