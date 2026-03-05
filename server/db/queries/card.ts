import { and, eq, desc } from 'drizzle-orm';
import { db } from '../../db';
import { card, cardSubscription } from '../schema';

export const findFreeCardByUserId = (userId: string) => {
  return db.query.card.findFirst({
    where: and(eq(card.userId, userId), eq(card.type, 'standard')),
  });
};

export const findCardsByUserId = async (userId: string) => {
  const rows = await db
    .select({
      card,
      subscriptionStatus: cardSubscription.status,
      subscriptionPlanCode: cardSubscription.planCode,
      subscriptionIsTrial: cardSubscription.isTrial,
    })
    .from(card)
    .leftJoin(cardSubscription, eq(cardSubscription.cardId, card.id))
    .where(eq(card.userId, userId))
    .orderBy(desc(card.createdAt));

  return rows.map((row) => ({
    ...row.card,
    subscription: row.subscriptionStatus
      ? {
          status: row.subscriptionStatus,
          planCode: row.subscriptionPlanCode,
          isTrial: row.subscriptionIsTrial ?? false,
        }
      : null,
  }));
};

export const findCardsBySlug = async (slug: string) => {
  return await db.query.card.findFirst({
    where: eq(card.slug, slug),
  });
};
