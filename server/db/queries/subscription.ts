import { and, eq, inArray } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  card,
  cardSubscription,
  subscriptionPayment,
  subscriptionPaymentItem,
} from '~~/server/db/schema';

export const findCardSubscriptionByCardId = async (cardId: string) => {
  return await db.query.cardSubscription.findFirst({
    where: eq(cardSubscription.cardId, cardId),
  });
};

export const findCardByIdAndOrganization = async (
  cardId: string,
  organizationId: string
) => {
  return await db.query.card.findFirst({
    where: and(eq(card.id, cardId), eq(card.organizationId, organizationId)),
  });
};

export const findCardsByIdsAndOrganization = async (
  cardIds: string[],
  organizationId: string
) => {
  return await db
    .select({ id: card.id })
    .from(card)
    .where(and(eq(card.organizationId, organizationId), inArray(card.id, cardIds)));
};

export const findSubscriptionPaymentByIdAndOrganization = async (
  paymentId: string,
  organizationId: string
) => {
  return await db.query.subscriptionPayment.findFirst({
    where: and(
      eq(subscriptionPayment.id, paymentId),
      eq(subscriptionPayment.organizationId, organizationId)
    ),
  });
};

export const findSubscriptionPaymentItems = async (paymentId: string) => {
  return await db.query.subscriptionPaymentItem.findMany({
    where: eq(subscriptionPaymentItem.paymentId, paymentId),
  });
};
