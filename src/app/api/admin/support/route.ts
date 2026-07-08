import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — every support thread for the admin inbox (OPEN first, newest activity
// first), each with the user, business, last message, and unread count.
export async function GET() {
  await requireRole("SUPERADMIN");

  const threads = await getPrisma().supportThread.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 100,
    include: {
      user: { select: { fullName: true, email: true } },
      tenant: { select: { businessName: true, name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const data = threads.map((t) => ({
    id: t.id,
    status: t.status,
    subject: t.subject,
    adminUnread: t.adminUnread,
    updatedAt: t.updatedAt,
    user: { name: t.user.fullName, email: t.user.email },
    business: t.tenant.businessName ?? t.tenant.name,
    lastMessage: t.messages[0]
      ? {
          body: t.messages[0].body,
          sender: t.messages[0].sender,
          createdAt: t.messages[0].createdAt,
        }
      : null,
  }));

  const unreadCount = threads.filter((t) => t.adminUnread > 0).length;
  return NextResponse.json({ threads: data, unreadCount });
}
