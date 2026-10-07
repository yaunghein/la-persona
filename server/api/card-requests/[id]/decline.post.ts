import { and, eq, or } from 'drizzle-orm';
import { db } from '~~/server/db';
import { cardRequest, subscriptionPayment, user } from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { enrichLog } from '~~/server/utils/wide-event';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const requestId = getRouterParam(event, 'id');
  if (!requestId) {
    throw createError({ statusCode: 400, statusMessage: 'Request id is required.' });
  }

  const existing = await db.query.cardRequest.findFirst({
    where: eq(cardRequest.id, requestId),
    columns: { id: true, status: true, userId: true },
  });
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Request not found.' });
  }
  if (existing.status !== 'pending') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only pending requests can be declined.',
    });
  }

  const now = new Date();
  const requestNotes = [
    `New design request (${requestId})`,
    `Existing design request (${requestId})`,
  ];

  const paymentIds = await db.transaction(async (tx) => {
    await tx
      .update(cardRequest)
      .set({ status: 'declined', updatedAt: now })
      .where(and(eq(cardRequest.id, requestId), eq(cardRequest.status, 'pending')));

    const payments = await tx
      .select({ id: subscriptionPayment.id })
      .from(subscriptionPayment)
      .where(
        and(
          eq(subscriptionPayment.status, 'submitted'),
          or(
            eq(subscriptionPayment.requestId, requestId),
            eq(subscriptionPayment.note, requestNotes[0]!),
            eq(subscriptionPayment.note, requestNotes[1]!)
          )
        )
      );

    if (payments.length > 0) {
      await tx
        .update(subscriptionPayment)
        .set({ status: 'rejected', updatedAt: now })
        .where(
          or(...payments.map((payment) => eq(subscriptionPayment.id, payment.id)))
        );
    }

    return payments.map((payment) => payment.id);
  });

  const requester = await db.query.user.findFirst({
    where: eq(user.id, existing.userId),
    columns: { email: true },
  });

  enrichLog(event, {
    card_request: {
      id: requestId,
      decision: 'declined',
      ...(requester?.email ? { requester_email: requester.email } : {}),
      payment_ids: paymentIds,
    },
  });

  return { id: requestId, status: 'declined', paymentIds };
});
