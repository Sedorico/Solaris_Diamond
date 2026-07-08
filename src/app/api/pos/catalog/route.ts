import { NextResponse } from "next/server";
import { getOwnerContext, unauthorized } from "@/lib/pos/api";
import { getCart, getSettings, listCatalog } from "@/lib/pos/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Register bootstrap — everything the sell screen needs in one round trip. */
export async function GET() {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  const [settings, catalog, cart] = await Promise.all([
    getSettings(session.tenantId),
    listCatalog(session.tenantId),
    getCart(session.tenantId),
  ]);
  return NextResponse.json({ settings, ...catalog, cart });
}
