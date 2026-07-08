import { NextResponse } from "next/server";
import { badRequest, parseUserAgent } from "@/lib/attendance/api";
import { getEmployeeSession } from "@/lib/attendance/employee-auth";
import { getTenantBySlug, punch } from "@/lib/attendance/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const session = await getEmployeeSession();
  if (!session || session.tid !== tenant.id || session.slug !== slug) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const type = body?.type;
  if (type !== "TIME_IN" && type !== "TIME_OUT") {
    return badRequest("Invalid punch type");
  }

  const { browser, device } = parseUserAgent(request.headers.get("user-agent"));
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;

  const result = await punch(tenant.id, session.eid, type, {
    browser,
    device,
    ipAddress,
  });
  if (!result.ok) return badRequest(result.reason ?? "Could not record punch");
  return NextResponse.json({ ok: true });
}
