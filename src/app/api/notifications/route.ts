import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getNotifications, markAllAsRead } from "@/lib/notifications/service";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const notifications = await getNotifications(session.id);
  const unread = notifications.filter((n) => !n.read).length;
  return NextResponse.json({ notifications, unread });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  if (body.action === "markAllRead") {
    await markAllAsRead(session.id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
