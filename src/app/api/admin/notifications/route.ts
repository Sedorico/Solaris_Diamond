import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { sendBulkNotification } from "@/lib/notifications/service";
import type { NotificationType } from "@prisma/client";

export async function POST(req: Request) {
  await requireRole("SUPERADMIN");
  const body = await req.json().catch(() => ({}));
  const { type, title, message } = body as {
    type?: NotificationType;
    title?: string;
    message?: string;
  };

  if (!type || !title || !message) {
    return NextResponse.json(
      { error: "type, title, message required" },
      { status: 400 },
    );
  }

  const count = await sendBulkNotification({ type, title, message });
  return NextResponse.json({ sent: count });
}
