import { desc, eq, inArray } from 'drizzle-orm';
import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import { cardRequest, subscriptionPayment, subscriptionPaymentItem, user } from '~~/server/db/schema';

function extractLinkedRequestId(note?: string | null) {
  if (!note) return null;
  const match = note.match(/^(?:New|Existing) design request \(([^)]+)\)$/);
  return match?.[1] || null;
}

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const payments = await db
    .select({
      id: subscriptionPayment.id,
      organizationId: subscriptionPayment.organizationId,
      paidByUserId: subscriptionPayment.paidByUserId,
      requestId: subscriptionPayment.requestId,
      receiptUrl: subscriptionPayment.receiptUrl,
      paymentReference: subscriptionPayment.paymentReference,
      paymentMethod: subscriptionPayment.paymentMethod,
      status: subscriptionPayment.status,
      note: subscriptionPayment.note,
      createdAt: subscriptionPayment.createdAt,
      updatedAt: subscriptionPayment.updatedAt,
      payerName: user.name,
      payerEmail: user.email,
    })
    .from(subscriptionPayment)
    .leftJoin(user, eq(user.id, subscriptionPayment.paidByUserId))
    .orderBy(desc(subscriptionPayment.createdAt));

  if (!payments.length) return [];

  const paymentIds = payments.map((payment) => payment.id);
  const items = await db
    .select({
      paymentId: subscriptionPaymentItem.paymentId,
      cardId: subscriptionPaymentItem.cardId,
      planCode: subscriptionPaymentItem.planCode,
      amountMinor: subscriptionPaymentItem.amountMinor,
      currency: subscriptionPaymentItem.currency,
      startAt: subscriptionPaymentItem.startAt,
      endAt: subscriptionPaymentItem.endAt,
    })
    .from(subscriptionPaymentItem)
    .where(inArray(subscriptionPaymentItem.paymentId, paymentIds));

  const itemsByPaymentId = new Map<string, typeof items>();
  for (const item of items) {
    const list = itemsByPaymentId.get(item.paymentId) || [];
    list.push(item);
    itemsByPaymentId.set(item.paymentId, list);
  }

  const linkedRequestIds = payments
    .map((payment) => payment.requestId || extractLinkedRequestId(payment.note))
    .filter((requestId): requestId is string => Boolean(requestId));
  const linkedRequests =
    linkedRequestIds.length > 0
      ? await db
          .select({
            id: cardRequest.id,
            status: cardRequest.status,
          })
          .from(cardRequest)
          .where(inArray(cardRequest.id, linkedRequestIds))
      : [];
  const linkedRequestStatusById = new Map(
    linkedRequests.map((request) => [request.id, request.status])
  );

  return payments.map((payment) => {
    const paymentItems = itemsByPaymentId.get(payment.id) || [];
    const linkedRequestId = payment.requestId || extractLinkedRequestId(payment.note);

    return {
      ...payment,
      linkedRequestId,
      linkedRequestStatus: linkedRequestId
        ? linkedRequestStatusById.get(linkedRequestId) || null
        : null,
      itemCount: paymentItems.length,
      totalAmountMinor: paymentItems.reduce(
        (sum, item) => sum + (item.amountMinor || 0),
        0
      ),
      currency: paymentItems[0]?.currency || null,
      items: paymentItems,
    };
  });
});
