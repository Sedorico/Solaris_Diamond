import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { renewSubscription } from "@/lib/subscriptions/service";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const sub = await getPrisma().subscription.findUnique({ where: { id } });

  if (!sub || sub.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const renewed = await renewSubscription(id);
  return NextResponse.json({ subscription: renewed });
}
