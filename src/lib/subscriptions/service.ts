import "server-only";
import { getPrisma } from "@/lib/db/prisma";
import { bundleMap, type BundleId } from "@/lib/data/bundles";
import type { ServiceId } from "@/lib/data/services";
import type {
  PlanInterval,
  ServiceKey,
  BundleKey,
  Subscription,
} from "@prisma/client";
import { calculateEndDate } from "./pricing";

const prisma = () => getPrisma();

function bundleIncludesService(
  bundleId: BundleKey,
  serviceId: ServiceKey,
): boolean {
  const bundle = bundleMap[bundleId as BundleId];
  return bundle ? bundle.services.includes(serviceId as ServiceId) : false;
}

export async function hasActiveSubscription(
  tenantId: string,
  serviceId: ServiceKey,
): Promise<boolean> {
  const now = new Date();

  const direct = await prisma().subscription.findFirst({
    where: {
      tenantId,
      service: serviceId,
      status: "ACTIVE",
      endDate: { gt: now },
    },
  });
  if (direct) return true;

  const bundleSubs = await prisma().subscription.findMany({
    where: {
      tenantId,
      bundle: { not: null },
      status: "ACTIVE",
      endDate: { gt: now },
    },
    select: { bundle: true },
  });

  return bundleSubs.some(
    (sub) => sub.bundle && bundleIncludesService(sub.bundle, serviceId),
  );
}

export async function getActiveSubscriptions(
  tenantId: string,
): Promise<Subscription[]> {
  return prisma().subscription.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
      endDate: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSubscribedServices(
  tenantId: string,
): Promise<ServiceId[]> {
  const subs = await getActiveSubscriptions(tenantId);
  const serviceSet = new Set<ServiceId>();

  for (const sub of subs) {
    if (sub.service) {
      serviceSet.add(sub.service as ServiceId);
    }
    if (sub.bundle) {
      const bundle = bundleMap[sub.bundle as BundleId];
      if (bundle) {
        for (const svcId of bundle.services) {
          serviceSet.add(svcId);
        }
      }
    }
  }

  return Array.from(serviceSet);
}

export async function activateSubscription(
  tenantId: string,
  opts: {
    service?: ServiceKey;
    bundle?: BundleKey;
    planInterval: PlanInterval;
    priceCents: number;
    paymentReference?: string;
  },
): Promise<Subscription> {
  const now = new Date();
  const endDate = calculateEndDate(now, opts.planInterval);

  return prisma().subscription.create({
    data: {
      tenantId,
      service: opts.service ?? null,
      bundle: opts.bundle ?? null,
      planInterval: opts.planInterval,
      status: "ACTIVE",
      priceCents: opts.priceCents,
      startDate: now,
      endDate,
      paymentReference: opts.paymentReference ?? null,
    },
  });
}

export async function renewSubscription(
  subscriptionId: string,
): Promise<Subscription> {
  const sub = await prisma().subscription.findUniqueOrThrow({
    where: { id: subscriptionId },
  });

  const newStart = sub.endDate > new Date() ? sub.endDate : new Date();
  const newEnd = calculateEndDate(newStart, sub.planInterval);

  return prisma().subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "ACTIVE",
      startDate: newStart,
      endDate: newEnd,
      canceledAt: null,
    },
  });
}

export async function cancelSubscription(
  subscriptionId: string,
): Promise<Subscription> {
  return prisma().subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
    },
  });
}

export async function expireOverdueSubscriptions(): Promise<number> {
  const result = await prisma().subscription.updateMany({
    where: {
      status: "ACTIVE",
      endDate: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });
  return result.count;
}

export async function getExpiringSubscriptions(
  daysAhead: number,
): Promise<Subscription[]> {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + daysAhead);

  return prisma().subscription.findMany({
    where: {
      status: "ACTIVE",
      endDate: { gt: now, lte: cutoff },
    },
    include: { tenant: { select: { name: true } } },
  });
}
