import "server-only";
import { getPrisma } from "@/lib/db/prisma";

/** Turn a business name into a URL-safe slug. */
export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "business"
  );
}

/**
 * Return the tenant's attendance-portal slug, generating and persisting a
 * unique one from the business name on first use. Uniqueness is enforced both
 * here and by the `@unique` constraint on `Tenant.slug`.
 */
export async function ensureTenantSlug(tenantId: string): Promise<string> {
  const prisma = getPrisma();
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true, businessName: true, name: true },
  });
  if (!tenant) throw new Error("Tenant not found");
  if (tenant.slug) return tenant.slug;

  const base = slugify(tenant.businessName || tenant.name);
  let candidate = base;
  let n = 1;
  // Walk suffixes until we find a free slug (races resolved by the DB unique
  // constraint on retry).
  while (
    await prisma.tenant.findFirst({
      where: { slug: candidate, NOT: { id: tenantId } },
      select: { id: true },
    })
  ) {
    candidate = `${base}-${n++}`;
  }

  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { slug: candidate },
    });
  } catch {
    // Lost a race on the unique constraint — re-read the now-set slug.
    const fresh = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });
    if (fresh?.slug) return fresh.slug;
    throw new Error("Could not assign a portal slug");
  }
  return candidate;
}
