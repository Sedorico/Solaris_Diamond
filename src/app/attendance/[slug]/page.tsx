import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPortalBranding, getTenantBySlug } from "@/lib/attendance/service";
import { getEmployeeSession } from "@/lib/attendance/employee-auth";
import { PortalApp } from "./_components/portal-app";

// Employee login/portal is fully dynamic — always server-rendered per request,
// never prerendered or cached. Branding (business name + logo) and the session
// check must reflect the owner's latest settings on every visit.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  const name = tenant?.businessName || tenant?.name;
  return {
    title: name ? `${name} — Attendance` : "Attendance",
    robots: { index: false, follow: false },
  };
}

export default async function AttendancePortalPage({ params }: Props) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const [session, branding] = await Promise.all([
    getEmployeeSession(),
    getPortalBranding(tenant.id, tenant.businessName || tenant.name),
  ]);
  const authed =
    !!session && session.tid === tenant.id && session.slug === slug;

  return (
    <PortalApp
      slug={slug}
      businessName={branding.businessName}
      logoUrl={branding.logoUrl}
      initialAuthed={authed}
    />
  );
}
