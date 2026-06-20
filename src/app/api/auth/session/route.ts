import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSubscribedServices } from "@/lib/subscriptions/service";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ user: null, subscribedServices: [] });
  }

  const subscribedServices = await getSubscribedServices(user.tenantId);
  return NextResponse.json({ user, subscribedServices });
}
