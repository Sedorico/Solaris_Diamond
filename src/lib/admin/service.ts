import "server-only";
import { getPrisma } from "@/lib/db/prisma";
import type { ServiceKey, BundleKey } from "@prisma/client";
import { bundleMap, type BundleId } from "@/lib/data/bundles";
import type { ServiceId } from "@/lib/data/services";

const prisma = () => getPrisma();

// ─────────────────────────────────────────────────────────────────────────────
// Period helpers
// ─────────────────────────────────────────────────────────────────────────────

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfYear(d = new Date()) {
  return new Date(d.getFullYear(), 0, 1);
}
function prevMonthRange(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const end = new Date(d.getFullYear(), d.getMonth(), 1);
  return { start, end };
}

function growthPct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard KPIs (with period comparison + growth deltas)
// ─────────────────────────────────────────────────────────────────────────────

export interface DashboardKPIs {
  totalSubscribers: number;
  totalSubscribersDelta: number;
  activeSubscribers: number;
  activeSubscribersDelta: number;
  expiredSubscribers: number;
  trialUsers: number;
  monthlyRevenueCents: number;
  monthlyRevenueDelta: number;
  annualRevenueCents: number;
  pendingPayments: number;
  totalBusinesses: number;
  totalBusinessesDelta: number;
  mrrCents: number;
  arrCents: number;
  arpcCents: number;
  churnRate: number;
}

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);
  const prevMonth = prevMonthRange(now);

  const [
    totalSubsNow,
    totalSubsPrev,
    activeSubsNow,
    activeSubscribersUnique,
    expiredSubs,
    trialUsers,
    monthlyAgg,
    prevMonthlyAgg,
    annualAgg,
    pendingPayments,
    businessesNow,
    businessesPrev,
    activeSubscriptionsForMRR,
    canceledThisMonth,
    activeAtStartOfMonth,
  ] = await Promise.all([
    prisma().subscription.count({ where: { createdAt: { lte: now } } }),
    prisma().subscription.count({ where: { createdAt: { lt: monthStart } } }),
    prisma().subscription.count({
      where: { status: "ACTIVE", endDate: { gt: now } },
    }),
    prisma().subscription
      .findMany({
        where: { status: "ACTIVE", endDate: { gt: now } },
        select: { tenantId: true },
        distinct: ["tenantId"],
      })
      .then((rows) => rows.length),
    prisma().subscription.count({ where: { status: "EXPIRED" } }),
    prisma().subscription.count({
      where: { status: "TRIALING", trialEndsAt: { gt: now } },
    }),
    prisma().payment.aggregate({
      where: { status: "PAID", createdAt: { gte: monthStart } },
      _sum: { amountCents: true },
    }),
    prisma().payment.aggregate({
      where: {
        status: "PAID",
        createdAt: { gte: prevMonth.start, lt: prevMonth.end },
      },
      _sum: { amountCents: true },
    }),
    prisma().payment.aggregate({
      where: { status: "PAID", createdAt: { gte: yearStart } },
      _sum: { amountCents: true },
    }),
    prisma().payment.count({ where: { status: "PENDING" } }),
    prisma().tenant.count(),
    prisma().tenant.count({ where: { createdAt: { lt: monthStart } } }),
    prisma().subscription.findMany({
      where: { status: "ACTIVE", endDate: { gt: now } },
      select: { priceCents: true, planInterval: true },
    }),
    prisma().subscription.count({
      where: {
        status: "CANCELED",
        canceledAt: { gte: monthStart },
      },
    }),
    prisma().subscription.count({
      where: {
        createdAt: { lt: monthStart },
        OR: [
          { status: "ACTIVE" },
          { canceledAt: { gte: monthStart } },
          { endDate: { gte: monthStart } },
        ],
      },
    }),
  ]);

  // Compute MRR: normalize all plans to monthly equivalent.
  const mrrCents = activeSubscriptionsForMRR.reduce((sum, sub) => {
    const months =
      sub.planInterval === "MONTHLY"
        ? 1
        : sub.planInterval === "QUARTERLY"
          ? 3
          : 12;
    return sum + Math.round(sub.priceCents / months);
  }, 0);
  const arrCents = mrrCents * 12;

  const arpcCents =
    activeSubscribersUnique > 0
      ? Math.round(mrrCents / activeSubscribersUnique)
      : 0;

  const churnRate =
    activeAtStartOfMonth > 0
      ? Math.round((canceledThisMonth / activeAtStartOfMonth) * 1000) / 10
      : 0;

  return {
    totalSubscribers: totalSubsNow,
    totalSubscribersDelta: growthPct(totalSubsNow, totalSubsPrev),
    activeSubscribers: activeSubscribersUnique,
    activeSubscribersDelta: growthPct(activeSubsNow, activeAtStartOfMonth),
    expiredSubscribers: expiredSubs,
    trialUsers,
    monthlyRevenueCents: monthlyAgg._sum.amountCents ?? 0,
    monthlyRevenueDelta: growthPct(
      monthlyAgg._sum.amountCents ?? 0,
      prevMonthlyAgg._sum.amountCents ?? 0,
    ),
    annualRevenueCents: annualAgg._sum.amountCents ?? 0,
    pendingPayments,
    totalBusinesses: businessesNow,
    totalBusinessesDelta: growthPct(businessesNow, businessesPrev),
    mrrCents,
    arrCents,
    arpcCents,
    churnRate,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Revenue time-series
// ─────────────────────────────────────────────────────────────────────────────

export async function getRevenueByMonth(months: number) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const payments = await prisma().payment.findMany({
    where: { status: "PAID", createdAt: { gte: from } },
    select: { amountCents: true, createdAt: true },
  });

  const buckets = new Map<string, number>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, 0);
  }

  for (const p of payments) {
    const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (buckets.has(key))
      buckets.set(key, (buckets.get(key) ?? 0) + p.amountCents);
  }

  return Array.from(buckets.entries()).map(([month, cents]) => ({
    month,
    revenueCents: cents,
  }));
}

export async function getRevenueByDay(days: number) {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - days + 1);
  from.setHours(0, 0, 0, 0);

  const payments = await prisma().payment.findMany({
    where: { status: "PAID", createdAt: { gte: from } },
    select: { amountCents: true, createdAt: true },
  });

  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, 0);
  }

  for (const p of payments) {
    const key = p.createdAt.toISOString().slice(0, 10);
    if (buckets.has(key))
      buckets.set(key, (buckets.get(key) ?? 0) + p.amountCents);
  }

  return Array.from(buckets.entries()).map(([day, cents]) => ({
    day,
    revenueCents: cents,
  }));
}

export async function getNewSubscribersByMonth(months: number) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const subs = await prisma().subscription.findMany({
    where: { createdAt: { gte: from } },
    select: { createdAt: true },
  });

  const buckets = new Map<string, number>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, 0);
  }

  for (const s of subs) {
    const key = `${s.createdAt.getFullYear()}-${String(s.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([month, count]) => ({
    month,
    count,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Service analytics
// ─────────────────────────────────────────────────────────────────────────────

export interface ServiceStat {
  service: ServiceId;
  subscribers: number;
  revenueCents: number;
  growthRate: number;
  churnRate: number;
}

export async function getServiceUsageStats(): Promise<ServiceStat[]> {
  const now = new Date();
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const [active, lastMonthActive, canceledThisMonth] = await Promise.all([
    prisma().subscription.findMany({
      where: { status: "ACTIVE", endDate: { gt: now } },
      select: { service: true, bundle: true, priceCents: true },
    }),
    prisma().subscription.findMany({
      where: { createdAt: { lt: monthAgo } },
      select: { service: true, bundle: true },
    }),
    prisma().subscription.findMany({
      where: {
        status: "CANCELED",
        canceledAt: { gte: monthAgo },
      },
      select: { service: true, bundle: true },
    }),
  ]);

  const subscribers = new Map<ServiceId, number>();
  const revenue = new Map<ServiceId, number>();
  const previous = new Map<ServiceId, number>();
  const churned = new Map<ServiceId, number>();

  function distribute(
    map: Map<ServiceId, number>,
    service: string | null,
    bundle: string | null,
    value = 1,
    splitForBundles = false,
  ) {
    if (service) {
      map.set(service as ServiceId, (map.get(service as ServiceId) ?? 0) + value);
    } else if (bundle) {
      const b = bundleMap[bundle as BundleId];
      if (b) {
        const split = splitForBundles ? Math.floor(value / b.services.length) : value;
        for (const svcId of b.services) {
          map.set(svcId, (map.get(svcId) ?? 0) + split);
        }
      }
    }
  }

  for (const sub of active) {
    distribute(subscribers, sub.service, sub.bundle);
    distribute(revenue, sub.service, sub.bundle, sub.priceCents, true);
  }
  for (const sub of lastMonthActive) {
    distribute(previous, sub.service, sub.bundle);
  }
  for (const sub of canceledThisMonth) {
    distribute(churned, sub.service, sub.bundle);
  }

  const allServices: ServiceId[] = [
    "inventory",
    "sales",
    "expenses",
    "pos",
    "attendance",
  ];

  return allServices.map((service) => {
    const subs = subscribers.get(service) ?? 0;
    const prev = previous.get(service) ?? 0;
    const ch = churned.get(service) ?? 0;
    return {
      service,
      subscribers: subs,
      revenueCents: revenue.get(service) ?? 0,
      growthRate: growthPct(subs, prev),
      churnRate: prev > 0 ? Math.round((ch / prev) * 1000) / 10 : 0,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// User / Customer management
// ─────────────────────────────────────────────────────────────────────────────

export async function listUsers(opts: { search?: string; limit?: number } = {}) {
  return prisma().user.findMany({
    where: opts.search
      ? {
          OR: [
            { fullName: { contains: opts.search, mode: "insensitive" } },
            { email: { contains: opts.search, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { tenant: { select: { businessName: true } } },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 100,
  });
}

export async function suspendUser(userId: string) {
  return prisma().user.update({
    where: { id: userId },
    data: { status: "SUSPENDED", suspendedAt: new Date() },
  });
}

export async function reactivateUser(userId: string) {
  return prisma().user.update({
    where: { id: userId },
    data: { status: "ACTIVE", suspendedAt: null },
  });
}

export async function deleteUser(userId: string) {
  return prisma().user.update({
    where: { id: userId },
    data: { status: "DELETED" },
  });
}

export interface CustomerRow {
  tenantId: string;
  businessName: string | null;
  tenantName: string;
  ownerName: string | null;
  ownerEmail: string | null;
  activeServices: number;
  hasActiveSubscription: boolean;
  lifetimeRevenueCents: number;
  lastActivityAt: Date | null;
  createdAt: Date;
}

export async function listCustomers(opts: { search?: string; limit?: number } = {}): Promise<CustomerRow[]> {
  const now = new Date();
  const tenants = await prisma().tenant.findMany({
    where: opts.search
      ? {
          OR: [
            { businessName: { contains: opts.search, mode: "insensitive" } },
            { name: { contains: opts.search, mode: "insensitive" } },
            {
              users: {
                some: {
                  OR: [
                    { fullName: { contains: opts.search, mode: "insensitive" } },
                    { email: { contains: opts.search, mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        }
      : undefined,
    include: {
      users: {
        where: { role: "OWNER" },
        select: { fullName: true, email: true, lastLoginAt: true },
        take: 1,
      },
      subscriptions: {
        where: { status: "ACTIVE", endDate: { gt: now } },
        select: { service: true, bundle: true },
      },
      payments: {
        where: { status: "PAID" },
        select: { amountCents: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 100,
  });

  return tenants.map((t) => {
    const services = new Set<string>();
    for (const sub of t.subscriptions) {
      if (sub.service) services.add(sub.service);
      else if (sub.bundle) {
        const b = bundleMap[sub.bundle as BundleId];
        if (b) for (const s of b.services) services.add(s);
      }
    }
    const owner = t.users[0];
    return {
      tenantId: t.id,
      businessName: t.businessName,
      tenantName: t.name,
      ownerName: owner?.fullName ?? null,
      ownerEmail: owner?.email ?? null,
      activeServices: services.size,
      hasActiveSubscription: t.subscriptions.length > 0,
      lifetimeRevenueCents: t.payments.reduce((s, p) => s + p.amountCents, 0),
      lastActivityAt: owner?.lastLoginAt ?? null,
      createdAt: t.createdAt,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Subscriptions
// ─────────────────────────────────────────────────────────────────────────────

export async function listSubscriptions(opts: { status?: string; limit?: number } = {}) {
  return prisma().subscription.findMany({
    where: opts.status
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { status: opts.status as any }
      : undefined,
    include: { tenant: { select: { name: true, businessName: true } } },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 100,
  });
}

export async function extendSubscription(id: string, days: number) {
  const sub = await prisma().subscription.findUniqueOrThrow({ where: { id } });
  const newEnd = new Date(sub.endDate);
  newEnd.setDate(newEnd.getDate() + days);
  return prisma().subscription.update({
    where: { id },
    data: { endDate: newEnd },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Payments
// ─────────────────────────────────────────────────────────────────────────────

export async function listPayments(opts: { status?: string; method?: string; limit?: number } = {}) {
  return prisma().payment.findMany({
    where: {
      ...(opts.status
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { status: opts.status as any }
        : {}),
      ...(opts.method ? { method: { contains: opts.method, mode: "insensitive" as const } } : {}),
    },
    include: { tenant: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 100,
  });
}

export async function getPaymentMethodBreakdown() {
  const payments = await prisma().payment.groupBy({
    by: ["method", "status"],
    _count: true,
    _sum: { amountCents: true },
  });
  return payments.map((p) => ({
    method: p.method,
    status: p.status,
    count: p._count,
    totalCents: p._sum.amountCents ?? 0,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit logs
// ─────────────────────────────────────────────────────────────────────────────

export async function listAuditLogs(opts: {
  search?: string;
  action?: string;
  from?: Date;
  to?: Date;
  limit?: number;
} = {}) {
  return prisma().auditLog.findMany({
    where: {
      ...(opts.action
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { action: opts.action as any }
        : {}),
      ...(opts.from || opts.to
        ? {
            createdAt: {
              ...(opts.from ? { gte: opts.from } : {}),
              ...(opts.to ? { lte: opts.to } : {}),
            },
          }
        : {}),
      ...(opts.search
        ? {
            OR: [
              { entityLabel: { contains: opts.search, mode: "insensitive" } },
              { entityType: { contains: opts.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      user: { select: { fullName: true, email: true } },
      tenant: { select: { name: true, businessName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 200,
  });
}

export async function listSystemLogs(opts: { limit?: number } = {}) {
  return prisma().systemLog.findMany({
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 200,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform health
// ─────────────────────────────────────────────────────────────────────────────

export interface HealthStatus {
  service: string;
  status: "operational" | "warning" | "critical" | "unknown";
  latencyMs: number | null;
  message: string;
}

export async function getPlatformHealth(): Promise<HealthStatus[]> {
  const checks: HealthStatus[] = [];

  // Database
  const dbStart = Date.now();
  try {
    await prisma().$queryRaw`SELECT 1`;
    const latency = Date.now() - dbStart;
    checks.push({
      service: "Database",
      status: latency > 500 ? "warning" : "operational",
      latencyMs: latency,
      message: `Connected · ${latency}ms`,
    });
  } catch (err) {
    checks.push({
      service: "Database",
      status: "critical",
      latencyMs: null,
      message: err instanceof Error ? err.message : "Connection failed",
    });
  }

  // Auth (Supabase) — we check via env presence; deep check would require API call
  const { integrations, env } = await import("@/lib/env");
  checks.push({
    service: "Authentication",
    status: integrations.supabase ? "operational" : "warning",
    latencyMs: null,
    message: integrations.supabase
      ? "Supabase configured"
      : "Running in mock mode",
  });

  // Email
  checks.push({
    service: "Email Delivery",
    status: integrations.resend ? "operational" : "warning",
    latencyMs: null,
    message: integrations.resend
      ? "Resend configured"
      : "Console-only (no API key)",
  });

  // Payment Gateway
  checks.push({
    service: "Payment Gateway",
    status: integrations.paymongo ? "operational" : "warning",
    latencyMs: null,
    message: integrations.paymongo
      ? "PayMongo configured"
      : "Mock checkout enabled",
  });

  // Storage (Supabase Storage proxied via the same project URL)
  checks.push({
    service: "Storage",
    status: env.supabaseUrl ? "operational" : "warning",
    latencyMs: null,
    message: env.supabaseUrl ? "Supabase Storage available" : "Not configured",
  });

  // API self-check (this very query succeeded)
  checks.push({
    service: "API",
    status: "operational",
    latencyMs: null,
    message: "Responding normally",
  });

  return checks;
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifications center (admin-facing alerts)
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminAlert {
  id: string;
  type:
    | "new_subscriber"
    | "expiring_subscription"
    | "failed_payment"
    | "system_warning";
  title: string;
  message: string;
  createdAt: Date;
  severity: "info" | "warning" | "critical";
}

export async function getAdminAlerts(limit = 20): Promise<AdminAlert[]> {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const threeDays = new Date(now);
  threeDays.setDate(threeDays.getDate() + 3);

  const [newSubs, expiring, failed] = await Promise.all([
    prisma().subscription.findMany({
      where: { createdAt: { gte: weekAgo } },
      include: { tenant: { select: { name: true, businessName: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma().subscription.findMany({
      where: {
        status: "ACTIVE",
        endDate: { gt: now, lte: threeDays },
      },
      include: { tenant: { select: { name: true, businessName: true } } },
      orderBy: { endDate: "asc" },
      take: limit,
    }),
    prisma().payment.findMany({
      where: { status: "FAILED", createdAt: { gte: weekAgo } },
      include: { tenant: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  const alerts: AdminAlert[] = [];

  for (const s of newSubs) {
    alerts.push({
      id: `new-${s.id}`,
      type: "new_subscriber",
      title: "New subscription",
      message: `${s.tenant.businessName ?? s.tenant.name} subscribed to ${s.service ?? s.bundle ?? "a plan"}`,
      createdAt: s.createdAt,
      severity: "info",
    });
  }
  for (const s of expiring) {
    const daysLeft = Math.ceil(
      (s.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    alerts.push({
      id: `exp-${s.id}`,
      type: "expiring_subscription",
      title: `Expiring in ${daysLeft}d`,
      message: `${s.tenant.businessName ?? s.tenant.name} · ${s.service ?? s.bundle}`,
      createdAt: s.endDate,
      severity: daysLeft <= 1 ? "critical" : "warning",
    });
  }
  for (const p of failed) {
    alerts.push({
      id: `fail-${p.id}`,
      type: "failed_payment",
      title: "Payment failed",
      message: `${p.tenant.name} · ${p.method} · ${(p.amountCents / 100).toLocaleString()} PHP`,
      createdAt: p.createdAt,
      severity: "warning",
    });
  }

  return alerts
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-service deep analytics (for /admin/services/[id])
// ─────────────────────────────────────────────────────────────────────────────

export async function getServiceAnalytics(serviceId: ServiceKey | BundleKey) {
  const now = new Date();
  const subs = await prisma().subscription.findMany({
    where: {
      OR: [{ service: serviceId as ServiceKey }, { bundle: serviceId as BundleKey }],
      status: "ACTIVE",
      endDate: { gt: now },
    },
  });

  return {
    activeSubscribers: subs.length,
    monthlyRevenueCents: subs.reduce((sum, s) => sum + s.priceCents, 0),
  };
}
