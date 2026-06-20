import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { markAsRead } from "@/lib/notifications/service";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  await markAsRead(id, session.id);
  return NextResponse.json({ ok: true });
}
