import { and, eq, inArray } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  card,
  cardRequest,
  cardSubscription,
  subscriptionPayment,
  subscriptionPaymentItem,
} from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Card id is required' });
  }

  const targetRows = await db
    .select({
      id: card.id,
      slug: card.slug,
      firstName: card.firstName,
      lastName: card.lastName,
      subscriptionStatus: cardSubscription.status,
    })
    .from(card)
    .leftJoin(cardSubscription, eq(cardSubscription.cardId, card.id))
    .where(eq(card.id, id))
    .limit(1);

  const targetCard = targetRows[0];
  if (!targetCard) {
    throw createError({ statusCode: 404, statusMessage: 'Card not found' });
  }

  const deletedCard = await db.transaction(async (tx) => {
    if (targetCard.subscriptionStatus === 'pending_approval') {
      const paymentRows = await tx
        .select({
          note: subscriptionPayment.note,
        })
        .from(subscriptionPaymentItem)
        .innerJoin(
          subscriptionPayment,
          eq(subscriptionPayment.id, subscriptionPaymentItem.paymentId)
        )
        .where(
          and(
            eq(subscriptionPaymentItem.cardId, targetCard.id),
            eq(subscriptionPayment.status, 'submitted')
          )
        );

      const requestIds = paymentRows
        .map((row) => {
          const note = row.note || '';
          const match = note.match(
            /^(?:Existing|New) design request \((?<requestId>[^)]+)\)$/
          );
          return match?.groups?.requestId || null;
        })
        .filter((rid): rid is string => Boolean(rid));

      if (requestIds.length > 0) {
        await tx
          .delete(cardRequest)
          .where(
            and(inArray(cardRequest.id, requestIds), eq(cardRequest.status, 'pending'))
          );
      }
    }

    const [deleted] = await tx
      .delete(card)
      .where(eq(card.id, targetCard.id))
      .returning({
        id: card.id,
        slug: card.slug,
        firstName: card.firstName,
        lastName: card.lastName,
      });

    if (!deleted) {
      throw createError({ statusCode: 404, statusMessage: 'Card not found' });
    }

    return deleted;
  });

  return { success: true, card: deletedCard };
});
