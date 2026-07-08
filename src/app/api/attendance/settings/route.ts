import { NextResponse } from "next/server";
import { getOwnerContext, unauthorized, badRequest } from "@/lib/attendance/api";
import { getSettings, updateSettings } from "@/lib/attendance/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  return NextResponse.json({ settings: await getSettings(session.tenantId) });
}

export async function PATCH(request: Request) {
  const session = await getOwnerContext();
  if (!session) return unauthorized();
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Invalid body");

  // Logos are stored inline as data URLs — keep them small to protect the DB.
  if (typeof body.logoUrl === "string" && body.logoUrl.length > 1_500_000) {
    return badRequest("Logo is too large — please use an image under 1MB");
  }

  const settings = await updateSettings(session.tenantId, {
    portalBusinessName:
      typeof body.portalBusinessName === "string"
        ? body.portalBusinessName.trim() || null
        : body.portalBusinessName,
    logoUrl: body.logoUrl,
    workdayStart: body.workdayStart,
    lateThresholdMinutes: body.lateThresholdMinutes,
    autoAbsentPending: body.autoAbsentPending,
    autoAbsentAfterHours: body.autoAbsentAfterHours,
    timezone: body.timezone,
  });
  return NextResponse.json({ settings });
}
