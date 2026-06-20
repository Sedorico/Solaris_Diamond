import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getActiveSubscriptions } from "@/lib/subscriptions/service";
import { getPrisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const active = await getActiveSubscriptions(session.tenantId);
  const all = await getPrisma().subscription.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ active, all });
}
