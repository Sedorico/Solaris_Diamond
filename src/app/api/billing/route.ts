import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();

  const [payments, invoices] = await Promise.all([
    prisma.payment.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.invoice.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { issuedAt: "desc" },
      take: 100,
    }),
  ]);

  return NextResponse.json({ payments, invoices });
}
