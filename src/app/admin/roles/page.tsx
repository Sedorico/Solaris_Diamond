"use client";

import { ShieldCheck, Wallet, Headphones, Lock } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";

const ROLES = [
  {
    id: "SUPERADMIN",
    name: "Super Admin",
    description: "Unrestricted access to every part of the platform.",
    icon: ShieldCheck,
    color: "text-accent",
    permissions: [
      "Manage subscribers & customers",
      "Manage subscriptions & billing",
      "View revenue & analytics",
      "Send platform-wide notifications",
      "Manage admin roles",
      "Read audit logs",
      "Configure platform settings",
    ],
  },
  {
    id: "FINANCE_ADMIN",
    name: "Finance Admin",
    description: "Revenue, payments, and billing operations only.",
    icon: Wallet,
    color: "text-success",
    permissions: [
      "View revenue & MRR",
      "Manage payments & invoices",
      "Reconcile billing issues",
      "Export financial reports",
    ],
    locked: true,
  },
  {
    id: "SUPPORT_ADMIN",
    name: "Support Admin",
    description: "Customer support and subscriber management.",
    icon: Headphones,
    color: "text-accent",
    permissions: [
      "View customers & subscribers",
      "Extend or restore subscriptions",
      "Send targeted notifications",
      "Read audit logs (read-only)",
    ],
    locked: true,
  },
];

export default function AdminRolesPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Admin Roles"
        description="Define what each admin can see and do on the platform."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {ROLES.map((role) => {
          const Icon = role.icon;
          return (
            <SectionCard key={role.id} className="relative flex flex-col">
              {role.locked && (
                <div className="absolute right-4 top-4">
                  <Badge variant="muted">
                    <Lock className="size-3" /> Coming soon
                  </Badge>
                </div>
              )}
              <span className={`flex size-10 items-center justify-center rounded-xl bg-accent-soft ${role.color}`}>
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">
                {role.name}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {role.description}
              </p>
              <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm">
                {role.permissions.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-foreground/40" />
                    {p}
                  </li>
                ))}
              </ul>
            </SectionCard>
          );
        })}
      </div>

      <SectionCard
        className="mt-6"
        title="Role assignment"
        description="Currently only Super Admin role is implemented in the database schema."
      >
        <p className="text-sm text-muted-foreground">
          To enable Finance Admin and Support Admin roles, expand the{" "}
          <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">Role</code>{" "}
          enum in <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">prisma/schema.prisma</code>{" "}
          and update <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">requireRole()</code>{" "}
          in <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">src/lib/auth/session.ts</code>{" "}
          to gate each permission group.
        </p>
      </SectionCard>
    </div>
  );
}
