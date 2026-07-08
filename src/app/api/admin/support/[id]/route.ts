import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function shape(thread: {
  id: string;
  status: string;
  subject: string | null;
  user: { fullName: string; email: string };
  tenant: { businessName: string | null; name: string };
  messages: { id: string; sender: string; body: string; createdAt: Date }[];
}) {
  return {
    id: thread.id,
    status: thread.status,
    subject: thread.subject,
    user: { name: thread.user.fullName, email: thread.user.email },
    business: thread.tenant.businessName ?? thread.tenant.name,
    messages: thread.messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      body: m.body,
      createdAt: m.createdAt,
    })),
  };
}

// GET — full thread + messages. Opening it clears the admin's unread flag.
export async function GET(_req: Request, ctx: Ctx) {
  await requireRole("SUPERADMIN");
  const { id } = await ctx.params;
  const prisma = getPrisma();

  const thread = await prisma.supportThread.findUnique({
    where: { id },
    include: {
      user: { select: { fullName: true, email: true } },
      tenant: { select: { businessName: true, name: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (thread.adminUnread > 0) {
    await prisma.supportThread.update({
      where: { id },
      data: { adminUnread: 0 },
    });
  }
  return NextResponse.json({ thread: shape(thread) });
}

// POST — admin replies (or closes the thread).
export async function POST(req: Request, ctx: Ctx) {
  await requireRole("SUPERADMIN");
  const { id } = await ctx.params;
  const prisma = getPrisma();

  const body = (await req.json().catch(() => ({}))) as {
    message?: string;
    close?: boolean;
  };

  if (body.close) {
    await prisma.supportThread.update({
      where: { id },
      data: { status: "CLOSED" },
    });
  } else {
    const message = String(body.message ?? "").slice(0, 2000).trim();
    if (!message) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }
    await prisma.supportMessage.create({
      data: { threadId: id, sender: "ADMIN", body: message },
    });
    await prisma.supportThread.update({
      where: { id },
      data: {
        userUnread: { increment: 1 },
        adminUnread: 0,
        status: "OPEN",
        updatedAt: new Date(),
      },
    });
  }

  const thread = await prisma.supportThread.findUnique({
    where: { id },
    include: {
      user: { select: { fullName: true, email: true } },
      tenant: { select: { businessName: true, name: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ thread: shape(thread) });
}
