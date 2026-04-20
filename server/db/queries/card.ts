import { and, eq, desc } from 'drizzle-orm';
import { getEffectiveSubscriptionStatus } from '~~/server/services/subscription';
import { db } from '../../db';
import { card, cardSubscription, subscriptionPlan } from '../schema';

export const findFreeCardByUserId = (userId: string) => {
  return db
    .select({ card })
    .from(card)
    .leftJoin(cardSubscription, eq(cardSubscription.cardId, card.id))
    .where(
      and(
        eq(card.userId, userId),
        eq(cardSubscription.planCode, 'standard'),
        eq(cardSubscription.isTrial, true)
      )
    )
    .limit(1)
    .then((rows) => rows[0]?.card ?? null);
};

export const findCardsByUserId = async (userId: string) => {
  const rows = await db
    .select({
      card,
      subscriptionStatus: cardSubscription.status,
      subscriptionPlanCode: cardSubscription.planCode,
      subscriptionPlanName: subscriptionPlan.name,
      subscriptionIsTrial: cardSubscription.isTrial,
    })
    .from(card)
    .leftJoin(cardSubscription, eq(cardSubscription.cardId, card.id))
    .leftJoin(subscriptionPlan, eq(subscriptionPlan.code, cardSubscription.planCode))
    .where(eq(card.userId, userId))
    .orderBy(desc(card.createdAt));

  return rows.map((row) => ({
    ...row.card,
    subscription: row.subscriptionStatus
      ? {
          status: row.subscriptionStatus,
          planCode: row.subscriptionPlanCode,
          planName: row.subscriptionPlanName,
          isTrial: row.subscriptionIsTrial ?? false,
        }
      : null,
  }));
};

export const findCardsByUserIdAndOrganization = async (
  userId: string,
  organizationId: string
) => {
  const rows = await db
    .select({
      card,
      subscriptionStatus: cardSubscription.status,
      subscriptionPlanCode: cardSubscription.planCode,
      subscriptionPlanName: subscriptionPlan.name,
      subscriptionIsTrial: cardSubscription.isTrial,
    })
    .from(card)
    .leftJoin(cardSubscription, eq(cardSubscription.cardId, card.id))
    .leftJoin(subscriptionPlan, eq(subscriptionPlan.code, cardSubscription.planCode))
    .where(and(eq(card.userId, userId), eq(card.organizationId, organizationId)))
    .orderBy(desc(card.createdAt));

  return rows.map((row) => ({
    ...row.card,
    subscription: row.subscriptionStatus
      ? {
          status: row.subscriptionStatus,
          planCode: row.subscriptionPlanCode,
          planName: row.subscriptionPlanName,
          isTrial: row.subscriptionIsTrial ?? false,
        }
      : null,
  }));
};

export const findCardsBySlug = async (slug: string) => {
  const rows = await db
    .select({
      card,
      subscriptionStatus: cardSubscription.status,
      subscriptionPlanCode: cardSubscription.planCode,
      subscriptionPlanName: subscriptionPlan.name,
      subscriptionIsTrial: cardSubscription.isTrial,
      subscriptionTrialEndAt: cardSubscription.trialEndAt,
      subscriptionCurrentPeriodEndAt: cardSubscription.currentPeriodEndAt,
    })
    .from(card)
    .leftJoin(cardSubscription, eq(cardSubscription.cardId, card.id))
    .leftJoin(subscriptionPlan, eq(subscriptionPlan.code, cardSubscription.planCode))
    .where(eq(card.slug, slug))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    ...row.card,
    subscription: row.subscriptionStatus
      ? {
          status: row.subscriptionStatus,
          planCode: row.subscriptionPlanCode,
          planName: row.subscriptionPlanName,
          isTrial: row.subscriptionIsTrial ?? false,
          effectiveStatus: getEffectiveSubscriptionStatus(
            row.subscriptionStatus,
            row.subscriptionTrialEndAt,
            row.subscriptionCurrentPeriodEndAt
          ),
        }
      : null,
  };
};

export const findCardBySlugForUserAndOrganization = async (
  slug: string,
  userId: string,
  organizationId: string
) => {
  const rows = await db
    .select({
      card,
      subscriptionStatus: cardSubscription.status,
      subscriptionPlanCode: cardSubscription.planCode,
      subscriptionPlanName: subscriptionPlan.name,
      subscriptionIsTrial: cardSubscription.isTrial,
    })
    .from(card)
    .leftJoin(cardSubscription, eq(cardSubscription.cardId, card.id))
    .leftJoin(subscriptionPlan, eq(subscriptionPlan.code, cardSubscription.planCode))
    .where(
      and(
        eq(card.slug, slug),
        eq(card.userId, userId),
        eq(card.organizationId, organizationId)
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    ...row.card,
    subscription: row.subscriptionStatus
      ? {
          status: row.subscriptionStatus,
          planCode: row.subscriptionPlanCode,
          planName: row.subscriptionPlanName,
          isTrial: row.subscriptionIsTrial ?? false,
        }
      : null,
  };
};
