import { and, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { card, member, organization, user } from '~~/server/db/schema';
import { env } from '~~/server/utils/env';
import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const userId = getRouterParam(event, 'id');
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'User id is required' });
  }

  const existing = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: {
      id: true,
      name: true,
      email: true,
      role: true,
      banned: true,
      createdAt: true,
    },
  });
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' });
  }

  const [memberships, cards, personalOrgs] = await Promise.all([
    db
      .select({
        id: member.id,
        role: member.role,
        organizationId: organization.id,
        organizationName: organization.name,
        organizationSlug: organization.slug,
        organizationType: organization.type,
      })
      .from(member)
      .innerJoin(organization, eq(organization.id, member.organizationId))
      .where(eq(member.userId, userId)),
    db
      .select({
        id: card.id,
        slug: card.slug,
        firstName: card.firstName,
        lastName: card.lastName,
        organizationId: card.organizationId,
      })
      .from(card)
      .where(eq(card.userId, userId)),
    db
      .select({
        id: organization.id,
        name: organization.name,
      })
      .from(organization)
      .innerJoin(member, eq(member.organizationId, organization.id))
      .where(
        and(
          eq(member.userId, userId),
          eq(member.role, 'owner'),
          eq(organization.type, ORGANIZATION_TYPES.PERSONAL)
        )
      ),
  ]);

  const personalOrganizations = personalOrgs.filter(
    (org) => org.id !== env.PLACEHOLDER_ORGANIZATION_ID
  );
  const cardCounts = await Promise.all(
    personalOrganizations.map(async (org) => {
      const rows = await db
        .select({ id: card.id })
        .from(card)
        .where(eq(card.organizationId, org.id));
      return { ...org, cardCount: rows.length };
    })
  );

  return {
    ...existing,
    memberships,
    cards,
    deletion: {
      personalOrganizations: cardCounts,
      communityMemberships: memberships.filter(
        (row) => row.organizationType === ORGANIZATION_TYPES.COMMUNITY
      ),
    },
  };
});
