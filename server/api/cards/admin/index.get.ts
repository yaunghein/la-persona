import { desc, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  card,
  cardSubscription,
  organization,
  user,
} from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { expireStaleSubscriptions } from '~~/server/services/subscription';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  await expireStaleSubscriptions();

  const rows = await db
    .select({
      id: card.id,
      slug: card.slug,
      firstName: card.firstName,
      lastName: card.lastName,
      position: card.position,
      company: card.company,
      phone: card.phone,
      phoneCountryCode: card.phoneCountryCode,
      email: card.email,
      website: card.website,
      splineUrl: card.splineUrl,
      avatarUrl: card.avatarUrl,
      wallpaperUrl: card.wallpaperUrl,
      cardBackUrl: card.cardBackUrl,
      organizationId: card.organizationId,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      organizationType: organization.type,
      userId: card.userId,
      linkedUserEmail: user.email,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      subscriptionStatus: cardSubscription.status,
      subscriptionPlanCode: cardSubscription.planCode,
      subscriptionIsTrial: cardSubscription.isTrial,
      subscriptionTrialEndAt: cardSubscription.trialEndAt,
      subscriptionPeriodEndAt: cardSubscription.currentPeriodEndAt,
    })
    .from(card)
    .innerJoin(organization, eq(organization.id, card.organizationId))
    .leftJoin(user, eq(user.id, card.userId))
    .leftJoin(cardSubscription, eq(cardSubscription.cardId, card.id))
    .orderBy(desc(card.updatedAt));

  return rows.map(
    ({
      subscriptionIsTrial,
      subscriptionTrialEndAt,
      subscriptionPeriodEndAt,
      ...row
    }) => ({
      ...row,
      subscriptionEndAt: subscriptionIsTrial
        ? subscriptionTrialEndAt
        : subscriptionPeriodEndAt,
    })
  );
});
