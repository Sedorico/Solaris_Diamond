import "server-only";
import { getPrisma } from "@/lib/db/prisma";
import {
  getExpiringSubscriptions,
  expireOverdueSubscriptions,
} from "@/lib/subscriptions/service";
import { createNotification } from "./service";
import {
  sendExpiryWarningEmail,
  sendExpiredEmail,
} from "@/lib/email/templates";
import { env } from "@/lib/env";
import { serviceMap, type ServiceId } from "@/lib/data/services";
import { bundleMap, type BundleId } from "@/lib/data/bundles";
import type { Subscription } from "@prisma/client";

const prisma = () => getPrisma();
const WARNING_DAYS = [7, 3, 1];

function subscriptionLabel(sub: Subscription): string {
  if (sub.bundle && bundleMap[sub.bundle as BundleId]) {
    return bundleMap[sub.bundle as BundleId].name;
  }
  if (sub.service && serviceMap[sub.service as ServiceId]) {
    return serviceMap[sub.service as ServiceId].name;
  }
  return "Subscription";
}

function daysBetween(later: Date, earlier: Date): number {
  return Math.ceil(
    (later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24),
  );
}

async function alreadyWarned(
  userId: string,
  subscriptionId: string,
  daysLeft: number,
): Promise<boolean> {
  const existing = await prisma().notification.findFirst({
    where: {
      userId,
      type: "EXPIRY_WARNING",
      metadata: { path: ["subscriptionId"], equals: subscriptionId },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!existing) return false;
  const meta = existing.metadata as { daysLeft?: number } | null;
  return meta?.daysLeft === daysLeft;
}

export async function processExpiryWarnings(): Promise<{ warned: number }> {
  const now = new Date();
  let warned = 0;

  for (const days of WARNING_DAYS) {
    const subs = await getExpiringSubscriptions(days);
    for (const sub of subs) {
      const daysLeft = daysBetween(sub.endDate, now);
      if (daysLeft !== days) continue;

      const owner = await prisma().user.findFirst({
        where: { tenantId: sub.tenantId, role: "OWNER" },
      });
      if (!owner) continue;

      if (await alreadyWarned(owner.id, sub.id, daysLeft)) continue;

      const label = subscriptionLabel(sub);
      const renewUrl = `${env.appUrl}/dashboard/renew/${sub.id}`;

      await createNotification({
        userId: owner.id,
        tenantId: sub.tenantId,
        type: "EXPIRY_WARNING",
        title: `${label} expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
        message: `Renew now to avoid interruption.`,
        metadata: { subscriptionId: sub.id, daysLeft },
      });

      await sendExpiryWarningEmail({
        to: owner.email,
        userName: owner.fullName,
        serviceName: label,
        daysLeft,
        renewUrl,
      });

      warned++;
    }
  }

  return { warned };
}

export async function processExpiredSubscriptions(): Promise<{
  expired: number;
}> {
  const beforeNow = new Date();
  const expiringSubs = await prisma().subscription.findMany({
    where: { status: "ACTIVE", endDate: { lt: beforeNow } },
    include: { tenant: true },
  });

  const expiredCount = await expireOverdueSubscriptions();

  for (const sub of expiringSubs) {
    const owner = await prisma().user.findFirst({
      where: { tenantId: sub.tenantId, role: "OWNER" },
    });
    if (!owner) continue;

    const label = subscriptionLabel(sub);
    const renewUrl = `${env.appUrl}/dashboard/renew/${sub.id}`;

    await createNotification({
      userId: owner.id,
      tenantId: sub.tenantId,
      type: "SUBSCRIPTION_EXPIRED",
      title: `${label} subscription expired`,
      message: `Access has been suspended. Renew to restore.`,
      metadata: { subscriptionId: sub.id },
    });

    await sendExpiredEmail({
      to: owner.email,
      userName: owner.fullName,
      serviceName: label,
      renewUrl,
    });
  }

  return { expired: expiredCount };
}
