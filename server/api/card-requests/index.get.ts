import { desc, eq, inArray, or } from 'drizzle-orm';
import { db } from '~~/server/db';
import { cardRequest, subscriptionPayment, user } from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';

function extractLinkedRequestId(note?: string | null) {
  if (!note) return null;
  const match = note.match(/^(?:New|Existing) design request \(([^)]+)\)$/);
  return match?.[1] || null;
}

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);

  const rows = await db
    .select({
      id: cardRequest.id,
      type: cardRequest.type,
      status: cardRequest.status,
      paymentReceiptUrl: cardRequest.paymentReceiptUrl,
      cardData: cardRequest.cardData,
      requesterName: user.name,
      requesterEmail: user.email,
      createdAt: cardRequest.createdAt,
      updatedAt: cardRequest.updatedAt,
    })
    .from(cardRequest)
    .leftJoin(user, eq(user.id, cardRequest.userId))
    .orderBy(desc(cardRequest.createdAt));

  const requestIds = rows.map((row) => row.id);
  const legacyNotes = requestIds.flatMap((requestId) => [
    `New design request (${requestId})`,
    `Existing design request (${requestId})`,
  ]);
  const linkedPayments =
    requestIds.length > 0
      ? await db
          .select({
            id: subscriptionPayment.id,
            requestId: subscriptionPayment.requestId,
            status: subscriptionPayment.status,
            note: subscriptionPayment.note,
            createdAt: subscriptionPayment.createdAt,
          })
          .from(subscriptionPayment)
          .where(
            or(
              inArray(subscriptionPayment.requestId, requestIds),
              inArray(subscriptionPayment.note, legacyNotes)
            )
          )
      : [];

  const paymentByRequestId = new Map<
    string,
    { id: string; status: string; createdAt: Date }
  >();
  for (const payment of linkedPayments) {
    const linkedRequestId =
      payment.requestId || extractLinkedRequestId(payment.note);
    if (!linkedRequestId) continue;

    const existing = paymentByRequestId.get(linkedRequestId);
    if (!existing || payment.createdAt > existing.createdAt) {
      paymentByRequestId.set(linkedRequestId, {
        id: payment.id,
        status: payment.status,
        createdAt: payment.createdAt,
      });
    }
  }

  return rows.map((row) => ({
    ...row,
    cardData: row.cardData || {},
    paymentId: paymentByRequestId.get(row.id)?.id || null,
    paymentStatus: paymentByRequestId.get(row.id)?.status || null,
  }));
});
