import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, getSession } from "@/lib/auth/session";
import {
  listEffectivePricing,
  upsertPricing,
  resetPricing,
} from "@/lib/pricing/service";

export async function GET() {
  await requireRole("SUPERADMIN");
  const pricing = await listEffectivePricing();
  return NextResponse.json({ pricing });
}

const updateSchema = z.object({
  key: z.string().min(1),
  monthlyPhp: z.number().int().nonnegative(),
});

export async function PUT(req: Request) {
  await requireRole("SUPERADMIN");
  const session = await getSession();

  const body = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const monthlyCents = parsed.data.monthlyPhp * 100;
  const row = await upsertPricing({
    key: parsed.data.key,
    monthlyCents,
    updatedByUserId: session?.id,
  });
  return NextResponse.json({ pricing: row });
}

const resetSchema = z.object({ key: z.string().min(1) });

export async function DELETE(req: Request) {
  await requireRole("SUPERADMIN");
  const body = await req.json().catch(() => ({}));
  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  await resetPricing(parsed.data.key);
  return NextResponse.json({ ok: true });
}
