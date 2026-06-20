import type { Metadata } from "next";
import { Mail, MessageSquare, MapPin, Clock } from "lucide-react";
import { PageHeader } from "@/components/marketing/page-header";
import { ContactForm } from "@/components/marketing/contact-form";
import { Reveal } from "@/components/motion/reveal";
import { siteConfig } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Solaris Diamond team. We usually reply within a few hours.",
};

const channels = [
  { icon: Mail, label: "Email us", value: siteConfig.email },
  { icon: MessageSquare, label: "Live chat", value: "In-app, 24/7" },
  { icon: MapPin, label: "Headquarters", value: "Manila · Singapore" },
  { icon: Clock, label: "Response time", value: "Under 4 hours" },
];

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Let's talk"
        description="Questions about plans, a custom rollout, or just want a demo? We'd love to hear from you."
      />

      <section className="mx-auto mt-16 grid w-full max-w-5xl gap-10 px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal className="flex flex-col gap-4">
          {channels.map((c) => (
            <div
              key={c.label}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5"
            >
              <span className="flex size-11 items-center justify-center rounded-xl border border-border bg-secondary text-foreground/80">
                <c.icon className="size-5" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="font-medium">{c.value}</p>
              </div>
            </div>
          ))}
        </Reveal>

        <Reveal delay={0.1}>
          <div className="rounded-2xl border border-border bg-card p-7 shadow-sm">
            <ContactForm />
          </div>
        </Reveal>
      </section>
      <div className="h-24" />
    </>
  );
}
