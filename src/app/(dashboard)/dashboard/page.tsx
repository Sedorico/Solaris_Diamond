"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Check, Lock, ArrowRight, ArrowUpRight } from "lucide-react";
import { services } from "@/lib/data/services";
import { getIcon } from "@/components/icon-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth/hooks";
import { cn } from "@/lib/utils";

export default function DashboardOverview() {
  const { user, subscribedServices } = useSession();

  return (
    <div className="mx-auto max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h2 className="text-2xl font-semibold tracking-tight">
          Welcome back
          {user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {user?.businessName
            ? `Here's your ${user.businessName} dashboard.`
            : "Manage your services and subscriptions."}
        </p>
      </motion.div>

      {/* Profile card */}
      <section className="mb-8 rounded-2xl border border-border bg-card p-6">
        <h3 className="font-semibold tracking-tight">Profile</h3>
        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Name</p>
            <p className="font-medium">{user?.fullName ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium">{user?.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Business</p>
            <p className="font-medium">{user?.businessName ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Member since</p>
            <p className="font-medium">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "—"}
            </p>
          </div>
        </div>
      </section>

      {/* Services */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight">Your modules</h3>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/billing">
            Manage <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service, i) => {
          const Icon = getIcon(service.icon);
          const unlocked = subscribedServices.includes(service.id);
          const href = unlocked
            ? `/dashboard/${service.id}`
            : `/dashboard/subscribe/${service.id}`;
          return (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: i * 0.05 }}
            >
              <Link
                href={href}
                className={cn(
                  "group relative flex h-full flex-col overflow-hidden rounded-2xl border p-5 transition-all",
                  unlocked
                    ? "border-border bg-card hover:border-accent/30 hover:shadow-premium"
                    : "border-dashed border-border bg-card/50",
                )}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={cn(
                      "flex size-11 items-center justify-center rounded-xl",
                      unlocked
                        ? "text-white"
                        : "bg-secondary text-muted-foreground",
                    )}
                    style={
                      unlocked
                        ? {
                            background: `linear-gradient(135deg, ${service.gradient[0]}, ${service.gradient[1]})`,
                          }
                        : undefined
                    }
                  >
                    <Icon className="size-5" />
                  </span>
                  {unlocked ? (
                    <Badge variant="success">
                      <Check className="size-3" /> Active
                    </Badge>
                  ) : (
                    <Badge variant="muted">
                      <Lock className="size-3" /> Not Purchased
                    </Badge>
                  )}
                </div>
                <h4 className="mt-4 font-semibold tracking-tight">
                  {service.name}
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  {service.tagline}
                </p>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                  {unlocked ? "Open module" : "Subscribe"}
                  <ArrowUpRight className="size-4" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
