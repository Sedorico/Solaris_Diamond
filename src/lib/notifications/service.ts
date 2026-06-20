import "server-only";
import { getPrisma } from "@/lib/db/prisma";
import type { NotificationType } from "@prisma/client";

const prisma = () => getPrisma();

export async function createNotification(opts: {
  userId: string;
  tenantId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma().notification.create({
    data: {
      userId: opts.userId,
      tenantId: opts.tenantId,
      type: opts.type,
      title: opts.title,
      message: opts.message,
      metadata: opts.metadata as object | undefined,
    },
  });
}

export async function getUnreadNotifications(userId: string) {
  return prisma().notification.findMany({
    where: { userId, read: false },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getNotifications(userId: string, limit = 50) {
  return prisma().notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function markAsRead(notificationId: string, userId: string) {
  return prisma().notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true, readAt: new Date() },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma().notification.updateMany({
    where: { userId, read: false },
    data: { read: true, readAt: new Date() },
  });
}

export async function sendBulkNotification(opts: {
  type: NotificationType;
  title: string;
  message: string;
  targetUserIds?: string[];
}): Promise<number> {
  const users = opts.targetUserIds
    ? await prisma().user.findMany({
        where: { id: { in: opts.targetUserIds } },
        select: { id: true, tenantId: true },
      })
    : await prisma().user.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, tenantId: true },
      });

  if (users.length === 0) return 0;

  const result = await prisma().notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      tenantId: u.tenantId,
      type: opts.type,
      title: opts.title,
      message: opts.message,
    })),
  });
  return result.count;
}
