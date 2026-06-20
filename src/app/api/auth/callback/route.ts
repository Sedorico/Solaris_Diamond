import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import { getPrisma } from "@/lib/db/prisma";

/**
 * Supabase Auth callback handler. Exchanges the auth code for a session,
 * then ensures a matching Prisma User + Tenant record exists.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({
    where: { authId: user.id },
  });

  if (!existing) {
    const fullName =
      user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User";
    const businessName = user.user_metadata?.business_name;

    const tenant = await prisma.tenant.create({
      data: {
        name: businessName || `${fullName}'s Business`,
        businessName: businessName || null,
      },
    });

    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        authId: user.id,
        fullName,
        email: user.email!,
        role: "OWNER",
        status: "ACTIVE",
        emailVerified: Boolean(user.email_confirmed_at),
      },
    });
  }

  return response;
}
