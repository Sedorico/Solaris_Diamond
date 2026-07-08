import { NextResponse } from "next/server";
import { getEmployeeSession } from "@/lib/attendance/employee-auth";
import { getPortalMe, getTenantBySlug } from "@/lib/attendance/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const session = await getEmployeeSession();
  // Strict multi-tenant check: the session must have been issued for THIS
  // business's slug and tenant. An employee of another business is rejected.
  if (!session || session.tid !== tenant.id || session.slug !== slug) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const me = await getPortalMe(tenant.id, session.eid);
  if (!me) {
    return NextResponse.json({ error: "Account unavailable" }, { status: 401 });
  }
  return NextResponse.json(me);
}
