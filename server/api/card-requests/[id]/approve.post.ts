import { and, eq } from 'drizzle-orm';
import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import {
  cardRequest,
  cardSubscription,
  subscriptionPayment,
  subscriptionPaymentItem,
} from '~~/server/db/schema';

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const requestId = getRouterParam(event, 'id');
  if (!requestId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Request id is required.',
    });
  }

  const existing = await db.query.cardRequest.findFirst({
    where: eq(cardRequest.id, requestId),
    columns: { id: true, status: true },
  });

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Request not found.' });
  }

  if (existing.status !== 'pending') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only pending requests can be approved.',
    });
  }

  const now = new Date();

  const payload = await db.transaction(async (tx) => {
    const [approved] = await tx
      .update(cardRequest)
      .set({ status: 'approved', updatedAt: now })
      .where(and(eq(cardRequest.id, requestId), eq(cardRequest.status, 'pending')))
      .returning();

    const requestNote = `Existing design request (${requestId})`;
    const payments = await tx
      .select({ id: subscriptionPayment.id })
      .from(subscriptionPayment)
      .where(
        and(
          eq(subscriptionPayment.note, requestNote),
          eq(subscriptionPayment.status, 'submitted')
        )
      );

    const paymentIds = payments.map((payment) => payment.id);

    if (paymentIds.length > 0) {
      await tx
        .update(subscriptionPayment)
        .set({ status: 'approved', updatedAt: now })
        .where(eq(subscriptionPayment.note, requestNote));

      for (const paymentId of paymentIds) {
        const items = await tx
          .select({
            id: subscriptionPaymentItem.id,
            cardId: subscriptionPaymentItem.cardId,
            planCode: subscriptionPaymentItem.planCode,
            startAt: subscriptionPaymentItem.startAt,
            endAt: subscriptionPaymentItem.endAt,
          })
          .from(subscriptionPaymentItem)
          .where(eq(subscriptionPaymentItem.paymentId, paymentId));

        for (const item of items) {
          await tx
            .insert(cardSubscription)
            .values({
              cardId: item.cardId,
              planCode: item.planCode,
              status: 'active',
              isTrial: false,
              currentPeriodStartAt: item.startAt,
              currentPeriodEndAt: item.endAt,
              lastPaymentItemId: item.id,
              activatedAt: now,
              expiredAt: null,
            })
            .onConflictDoUpdate({
              target: cardSubscription.cardId,
              set: {
                planCode: item.planCode,
                status: 'active',
                isTrial: false,
                currentPeriodStartAt: item.startAt,
                currentPeriodEndAt: item.endAt,
                lastPaymentItemId: item.id,
                activatedAt: now,
                expiredAt: null,
                updatedAt: now,
              },
            });
        }
      }
    }

    return approved;
  });

  return payload;
});
