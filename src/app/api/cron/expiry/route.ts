import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import {
  processExpiryWarnings,
  processExpiredSubscriptions,
} from "@/lib/notifications/expiry-job";

export async function GET(req: Request) {
  const header = req.headers.get("authorization");
  const expected = env.cronSecret ? `Bearer ${env.cronSecret}` : null;

  if (expected && header !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const warnings = await processExpiryWarnings();
  const expired = await processExpiredSubscriptions();

  return NextResponse.json({ warnings, expired });
}
