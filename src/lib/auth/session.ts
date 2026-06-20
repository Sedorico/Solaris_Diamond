import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPrisma } from "@/lib/db/prisma";
import { integrations } from "@/lib/env";
import type { Role } from "@prisma/client";

export interface SessionUser {
  id: string;
  authId: string;
  tenantId: string;
  fullName: string;
  email: string;
  role: Role;
  businessName: string | null;
  emailVerified: boolean;
  createdAt: Date;
}

/**
 * Returns the current session user, or null. If a valid Supabase session
 * exists but no Prisma User row, one is lazily created (with a fresh Tenant)
 * from the auth user's metadata. This handles email-link signups that don't
 * pass through /api/auth/callback.
 */
export async function getSession(): Promise<SessionUser | null> {
  if (!integrations.supabase || !integrations.database) return null;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return null;

    const prisma = getPrisma();
    let user = await prisma.user.findUnique({
      where: { authId: authUser.id },
      include: { tenant: { select: { businessName: true } } },
    });

    if (!user) {
      const byEmail = authUser.email
        ? await prisma.user.findUnique({
            where: { email: authUser.email },
            include: { tenant: { select: { businessName: true } } },
          })
        : null;

      if (byEmail) {
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: { authId: authUser.id },
          include: { tenant: { select: { businessName: true } } },
        });
      } else {
        const fullName =
          (authUser.user_metadata?.full_name as string | undefined) ??
          authUser.email?.split("@")[0] ??
          "User";
        const businessName =
          (authUser.user_metadata?.business_name as string | undefined) ?? null;

        const tenant = await prisma.tenant.create({
          data: {
            name: businessName || `${fullName}'s Business`,
            businessName,
          },
        });

        user = await prisma.user.create({
          data: {
            tenantId: tenant.id,
            authId: authUser.id,
            fullName,
            email: authUser.email!,
            role: "OWNER",
            status: "ACTIVE",
            emailVerified: Boolean(authUser.email_confirmed_at),
          },
          include: { tenant: { select: { businessName: true } } },
        });
      }
    }

    return {
      id: user.id,
      authId: authUser.id,
      tenantId: user.tenantId,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      businessName: user.tenant.businessName,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(role: Role): Promise<SessionUser> {
  const session = await requireSession();
  const hierarchy: Record<Role, number> = {
    STAFF: 0,
    ADMIN: 1,
    OWNER: 2,
    SUPERADMIN: 3,
  };
  if (hierarchy[session.role] < hierarchy[role]) {
    redirect("/");
  }
  return session;
}
