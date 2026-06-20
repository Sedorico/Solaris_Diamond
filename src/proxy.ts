import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Edge of the app — Next.js 16 `proxy` (formerly `middleware`).
 *
 * Refreshes the Supabase auth session cookie and gates protected routes.
 * - /dashboard/* → requires authenticated user
 * - /admin/* → requires authenticated user (SUPERADMIN checked server-side)
 * - /login, /register → redirects to / if already logged in
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
  const isAdminRoute = pathname.startsWith("/admin");
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/verify" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";

  // ── Mock mode: no Supabase keys — skip auth gating entirely ──────────────
  // Auth is handled client-side via Zustand (auth-store.ts) in this mode.
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  // ── Production mode: Supabase session refresh + route gating ─────────────
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtected && !user) {
    if (pathname === "/admin/login") return response;

    const url = request.nextUrl.clone();
    url.pathname = isAdminRoute ? "/admin/login" : "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};