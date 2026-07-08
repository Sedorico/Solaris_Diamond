import { NextResponse } from "next/server";
import { badRequest } from "@/lib/attendance/api";
import { authenticateEmployee, getTenantBySlug } from "@/lib/attendance/service";
import { setEmployeeSession } from "@/lib/attendance/employee-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const username = (body?.username ?? "").toString();
  const password = (body?.password ?? "").toString();
  if (!username || !password) return badRequest("Username and password are required");

  const result = await authenticateEmployee(tenant.id, username, password);
  if (!result.ok || !result.employeeId) {
    return NextResponse.json(
      { error: result.reason ?? "Invalid username or password" },
      { status: 401 },
    );
  }

  await setEmployeeSession({ eid: result.employeeId, tid: tenant.id, slug });
  return NextResponse.json({ ok: true });
}
