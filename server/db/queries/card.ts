import { and, eq, desc } from 'drizzle-orm';
import { getEffectiveSubscriptionStatus } from '~~/server/services/subscription';
import { db } from '../../db';
import { card, cardSubscription, organization, subscriptionPlan } from '../schema';

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

export const findCardByUserIdAndOrganization = async (
  userId: string,
  organizationId: string
) => {
  const [row] = await db
    .select()
    .from(card)
    .where(and(eq(card.userId, userId), eq(card.organizationId, organizationId)))
    .orderBy(desc(card.createdAt))
    .limit(1);

  return row ?? null;
};

export const findCardBySlugAndOrganization = async (
  slug: string,
  organizationId: string
) => {
  const [row] = await db
    .select()
    .from(card)
    .where(and(eq(card.slug, slug), eq(card.organizationId, organizationId)))
    .limit(1);

  return row ?? null;
};

const mapOrganizationCardRows = (
  rows: {
    card: typeof card.$inferSelect;
    subscriptionStatus: string | null;
    subscriptionPlanCode: string | null;
    subscriptionPlanName: string | null;
    subscriptionIsTrial: boolean | null;
  }[]
) =>
  rows.map((row) => ({
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

export const findCardsByOrganization = async (organizationId: string) => {
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
    .where(eq(card.organizationId, organizationId))
    .orderBy(desc(card.createdAt));

  return mapOrganizationCardRows(rows);
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

  return mapOrganizationCardRows(rows);
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

const findOrganizationCardBySlug = async (
  slug: string,
  organizationId: string,
  userId?: string
) => {
  const rows = await db
    .select({
      card,
      organizationType: organization.type,
      organizationName: organization.name,
      subscriptionStatus: cardSubscription.status,
      subscriptionPlanCode: cardSubscription.planCode,
      subscriptionPlanName: subscriptionPlan.name,
      subscriptionIsTrial: cardSubscription.isTrial,
    })
    .from(card)
    .innerJoin(organization, eq(organization.id, card.organizationId))
    .leftJoin(cardSubscription, eq(cardSubscription.cardId, card.id))
    .leftJoin(subscriptionPlan, eq(subscriptionPlan.code, cardSubscription.planCode))
    .where(
      and(
        eq(card.slug, slug),
        eq(card.organizationId, organizationId),
        ...(userId ? [eq(card.userId, userId)] : [])
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    ...row.card,
    organizationType: row.organizationType,
    organizationName: row.organizationName,
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

export const findCardBySlugInOrganization = async (
  slug: string,
  organizationId: string
) => findOrganizationCardBySlug(slug, organizationId);

export const findCardBySlugForUserAndOrganization = async (
  slug: string,
  userId: string,
  organizationId: string
) => findOrganizationCardBySlug(slug, organizationId, userId);
