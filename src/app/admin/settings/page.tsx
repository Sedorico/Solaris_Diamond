"use client";

import { Settings, Key, Mail, CreditCard, Webhook } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";

const SECTIONS = [
  {
    icon: Key,
    title: "Authentication",
    description: "Supabase project configuration",
    items: [
      "Project URL & API keys",
      "Email confirmation flow",
      "Password policies",
    ],
  },
  {
    icon: Mail,
    title: "Email Delivery",
    description: "Transactional email via Resend",
    items: [
      "Sender domain & DNS",
      "Template customization",
      "Bounce handling",
    ],
  },
  {
    icon: CreditCard,
    title: "Payments",
    description: "PayMongo gateway settings",
    items: [
      "API keys & webhook secret",
      "Enabled payment methods",
      "Refund policies",
    ],
  },
  {
    icon: Webhook,
    title: "Webhooks",
    description: "Outbound platform events",
    items: [
      "Subscription lifecycle events",
      "Payment events",
      "Retry policies",
    ],
  },
];

export default function AdminSettingsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Platform Settings"
        description="Configure infrastructure, integrations, and policies."
      />

      <SectionCard
        className="mb-6 border-dashed bg-secondary/20"
        title="Configuration source"
        description="Sensitive settings are managed via environment variables for safety."
      >
        <p className="text-sm text-muted-foreground">
          Settings panels below are read-only reference. To change values, edit{" "}
          <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">.env</code>{" "}
          and restart the server. A UI-based editor is planned for a future release.
        </p>
      </SectionCard>

      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <SectionCard key={s.title}>
              <div className="flex items-start gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-foreground/60">
                  <Icon className="size-5" />
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold tracking-tight">{s.title}</h3>
                    <Badge variant="muted">
                      <Settings className="size-3" /> Env-managed
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {s.description}
                  </p>
                  <ul className="mt-3 flex flex-col gap-1.5 text-sm">
                    {s.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2 text-foreground/80"
                      >
                        <span className="size-1 rounded-full bg-foreground/40" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}
