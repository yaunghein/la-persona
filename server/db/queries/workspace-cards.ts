import { and, desc, eq, inArray, or } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  card,
  cardSubscription,
  member,
  organization,
  subscriptionPlan,
} from '~~/server/db/schema';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export async function findWorkspaceCardsForUser(userId: string) {
  const memberships = await db
    .select({
      organizationId: member.organizationId,
      type: organization.type,
    })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(eq(member.userId, userId));

  const personalIds = memberships
    .filter((item) => item.type === ORGANIZATION_TYPES.PERSONAL)
    .map((item) => item.organizationId);
  const communityIds = memberships
    .filter((item) => item.type === ORGANIZATION_TYPES.COMMUNITY)
    .map((item) => item.organizationId);

  const scopes = [];
  if (personalIds.length) {
    scopes.push(inArray(card.organizationId, personalIds));
  }
  if (communityIds.length) {
    scopes.push(
      and(inArray(card.organizationId, communityIds), eq(card.userId, userId))
    );
  }
  if (!scopes.length) return [];

  const rows = await db
    .select({
      card,
      subscriptionStatus: cardSubscription.status,
      subscriptionPlanCode: cardSubscription.planCode,
      subscriptionPlanName: subscriptionPlan.name,
      subscriptionIsTrial: cardSubscription.isTrial,
      organizationName: organization.name,
      organizationType: organization.type,
      organizationSlug: organization.slug,
    })
    .from(card)
    .innerJoin(organization, eq(organization.id, card.organizationId))
    .leftJoin(cardSubscription, eq(cardSubscription.cardId, card.id))
    .leftJoin(
      subscriptionPlan,
      eq(subscriptionPlan.code, cardSubscription.planCode)
    )
    .where(or(...scopes)!)
    .orderBy(desc(card.createdAt));

  return rows.map((row) => ({
    ...row.card,
    organizationName: row.organizationName,
    organizationType: row.organizationType as 'personal' | 'community',
    organizationSlug: row.organizationSlug,
    subscription: row.subscriptionStatus
      ? {
          status: row.subscriptionStatus,
          planCode: row.subscriptionPlanCode,
          planName: row.subscriptionPlanName,
          isTrial: row.subscriptionIsTrial ?? false,
        }
      : null,
  }));
}
