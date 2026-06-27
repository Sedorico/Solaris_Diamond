import type { Metadata } from "next";
import { ShieldCheck, Zap, Lock } from "lucide-react";
import { PageHeader } from "@/components/marketing/page-header";
import { CtaSection } from "@/components/marketing/cta-section";
import { PaymentShowcase } from "@/components/marketing/payment-showcase";
import { Stagger, StaggerItem } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Payment",
  description:
    "The payment methods Solaris Diamond accepts — GCash, Maya, PayPal and bank transfer, all secured by PayMongo.",
};

const trust = [
  {
    icon: ShieldCheck,
    title: "Bank-grade security",
    desc: "Every transaction is encrypted and handled by PayMongo — we never see or store your card or wallet details.",
  },
  {
    icon: Zap,
    title: "Instant activation",
    desc: "Your plan switches on the moment your payment succeeds. No waiting, no manual steps.",
  },
  {
    icon: Lock,
    title: "No hidden fees",
    desc: "The price you see is the price you pay. No setup fees, no contracts — cancel anytime.",
  },
];

export default function PaymentPage() {
  return (
    <>
      <PageHeader
        eyebrow="Payment"
        title={
          <>
            Pay your way,{" "}
            <span className="text-gradient-accent">securely.</span>
          </>
        }
        description="Choose from the payment methods you already use. Every plan is billed in PHP and processed through PayMongo with bank-grade security."
      />

      <PaymentShowcase withHeading={false} />

      <section className="mx-auto mt-20 w-full max-w-5xl px-6">
        <Stagger className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
          {trust.map((t) => {
            const Icon = t.icon;
            return (
              <StaggerItem key={t.title} className="bg-card p-7">
                <Icon className="size-5 text-accent" />
                <p className="font-display mt-4 text-lg font-medium">{t.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {t.desc}
                </p>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>

      <div className="h-24 sm:h-32" />
      <CtaSection />
      <div className="h-10" />
    </>
  );
}
