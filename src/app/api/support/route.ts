import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — the signed-in user's current open support thread + its messages.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const thread = await getPrisma().supportThread.findFirst({
    where: { userId: session.id, status: "OPEN" },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({ thread });
}

// POST — request a human / send a message. Creates (or reuses) the user's open
// thread, appends a USER message, and flags it unread for the admin inbox.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { message?: string; markRead?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — falls back to the default request line
  }

  const prisma = getPrisma();

  // Mark the user's side as read (they're viewing the admin's reply).
  if (body.markRead) {
    const existing = await prisma.supportThread.findFirst({
      where: { userId: session.id, status: "OPEN" },
      orderBy: { updatedAt: "desc" },
    });
    if (existing && existing.userUnread > 0) {
      await prisma.supportThread.update({
        where: { id: existing.id },
        data: { userUnread: 0 },
      });
    }
    const full = existing
      ? await prisma.supportThread.findUnique({
          where: { id: existing.id },
          include: { messages: { orderBy: { createdAt: "asc" } } },
        })
      : null;
    return NextResponse.json({ thread: full });
  }

  const message = String(body.message ?? "I'd like to talk to a Solaris admin.")
    .slice(0, 2000)
    .trim();
  if (!message) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  let thread = await prisma.supportThread.findFirst({
    where: { userId: session.id, status: "OPEN" },
    orderBy: { updatedAt: "desc" },
  });
  if (!thread) {
    thread = await prisma.supportThread.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        subject: message.slice(0, 80),
      },
    });
  }

  await prisma.supportMessage.create({
    data: { threadId: thread.id, sender: "USER", body: message },
  });
  await prisma.supportThread.update({
    where: { id: thread.id },
    data: { adminUnread: { increment: 1 }, updatedAt: new Date() },
  });

  const full = await prisma.supportThread.findUnique({
    where: { id: thread.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({ thread: full });
}
