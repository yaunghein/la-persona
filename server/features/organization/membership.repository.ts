import { and, eq, type SQL } from 'drizzle-orm';
import { db } from '~~/server/db';
import { member, organization } from '~~/server/db/schema';

export type OrganizationMembership = {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    type: string | null;
  };
  membership: {
    id: string;
    role: string;
  };
};

async function findMembership(
  userId: string,
  organizationFilter: SQL
): Promise<OrganizationMembership | null> {
  const [row] = await db
    .select({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        type: organization.type,
      },
      membership: { id: member.id, role: member.role },
    })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(and(eq(member.userId, userId), organizationFilter))
    .limit(1);
  return row ?? null;
}

export function findMembershipByOrganizationSlug(
  userId: string,
  organizationSlug: string
) {
  return findMembership(userId, eq(organization.slug, organizationSlug));
}

export function findMembershipByOrganizationId(
  userId: string,
  organizationId: string
) {
  return findMembership(userId, eq(organization.id, organizationId));
}
