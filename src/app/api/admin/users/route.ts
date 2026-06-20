import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import {
  listUsers,
  suspendUser,
  reactivateUser,
  deleteUser,
} from "@/lib/admin/service";

export async function GET(req: Request) {
  await requireRole("SUPERADMIN");
  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const users = await listUsers({ search });
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  await requireRole("SUPERADMIN");
  const body = await req.json().catch(() => ({}));
  const { action, userId } = body as { action?: string; userId?: string };
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  switch (action) {
    case "suspend":
      return NextResponse.json({ user: await suspendUser(userId) });
    case "reactivate":
      return NextResponse.json({ user: await reactivateUser(userId) });
    case "delete":
      return NextResponse.json({ user: await deleteUser(userId) });
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
