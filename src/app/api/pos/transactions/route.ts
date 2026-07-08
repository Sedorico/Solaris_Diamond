import { NextResponse } from "next/server";
import {
  getOwnerContext,
  unauthorized,
  pinRequired,
  hasAdminAccess,
} from "@/lib/pos/api";
import { listTransactions } from "@/lib/pos/service";
import type { PosTransactionFilters } from "@/lib/pos/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Transaction history — an admin area, PIN-gated when a PIN is configured. */
export async function GET(request: Request) {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  if (!(await hasAdminAccess(session.tenantId))) return pinRequired();

  const url = new URL(request.url);
  const num = (v: string | null) => {
    const n = Number(v);
    return v != null && Number.isFinite(n) ? n : undefined;
  };
  const filters: PosTransactionFilters = {
    search: url.searchParams.get("search") ?? undefined,
    status: (url.searchParams.get("status") as PosTransactionFilters["status"]) ?? undefined,
    method: (url.searchParams.get("method") as PosTransactionFilters["method"]) ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    minTotal: num(url.searchParams.get("minTotal")),
    maxTotal: num(url.searchParams.get("maxTotal")),
    sort: (url.searchParams.get("sort") as PosTransactionFilters["sort"]) ?? undefined,
    limit: num(url.searchParams.get("limit")),
    offset: num(url.searchParams.get("offset")),
  };
  return NextResponse.json(await listTransactions(session.tenantId, filters));
}
