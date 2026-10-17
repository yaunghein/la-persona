import { and, count, desc, eq, inArray, or } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  card,
  cardRequest,
  cardSubscription,
  subscriptionPayment,
  subscriptionPaymentItem,
  user,
} from '~~/server/db/schema';
import {
  activatePaidSubscription,
  type Transaction,
} from '~~/server/features/billing/billing.repository';

export type CardRequestRecord = typeof cardRequest.$inferSelect;

/** Payment notes written before `subscription_payment.request_id` existed. */
function legacyRequestNotes(requestId: string) {
  return [
    `New design request (${requestId})`,
    `Existing design request (${requestId})`,
  ];
}

function linkedToRequest(requestId: string) {
  return or(
    eq(subscriptionPayment.requestId, requestId),
    inArray(subscriptionPayment.note, legacyRequestNotes(requestId))
  );
}

export async function findDesignSourceCard(cardId: string, organizationId: string) {
  const [row] = await db
    .select({
      card,
      subscription: {
        planCode: cardSubscription.planCode,
        status: cardSubscription.status,
        isTrial: cardSubscription.isTrial,
      },
    })
    .from(card)
    .leftJoin(cardSubscription, eq(cardSubscription.cardId, card.id))
    .where(and(eq(card.id, cardId), eq(card.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

/**
 * Creates the requested card, the request, its payment (one line for the
 * plan's first year) and a pending-approval subscription, atomically.
 */
export function insertCardRequestWithPayment(input: {
  card: typeof card.$inferInsert;
  request: Omit<typeof cardRequest.$inferInsert, 'status'>;
  organizationId: string;
  plan: { code: string; priceMinor: number; currency: string };
  term: { startAt: Date; endAt: Date };
}) {
  const now = new Date();
  return db.transaction(async (tx) => {
    const [createdCard] = await tx
      .insert(card)
      .values(input.card)
      .returning({ id: card.id, slug: card.slug });
    const [request] = await tx
      .insert(cardRequest)
      .values({ ...input.request, status: 'pending' })
      .returning({ id: cardRequest.id });
    if (!createdCard || !request) throw new Error('Card request insert failed.');

    const [payment] = await tx
      .insert(subscriptionPayment)
      .values({
        organizationId: input.organizationId,
        paidByUserId: input.request.userId,
        requestId: request.id,
        receiptUrl: input.request.paymentReceiptUrl,
        status: 'submitted',
        note: `${input.request.type === 'new_design' ? 'New' : 'Existing'} design request (${request.id})`,
      })
      .returning({ id: subscriptionPayment.id });
    if (!payment) throw new Error('Payment insert failed.');

    const [item] = await tx
      .insert(subscriptionPaymentItem)
      .values({
        paymentId: payment.id,
        cardId: createdCard.id,
        planCode: input.plan.code,
        termYears: 1,
        startAt: input.term.startAt,
        endAt: input.term.endAt,
        amountMinor: input.plan.priceMinor,
        currency: input.plan.currency,
      })
      .returning({ id: subscriptionPaymentItem.id });

    const subscription = {
      planCode: input.plan.code,
      status: 'pending_approval',
      isTrial: false,
      currentPeriodStartAt: input.term.startAt,
      currentPeriodEndAt: input.term.endAt,
      lastPaymentItemId: item?.id,
      activatedAt: null,
      expiredAt: null,
    };
    await tx
      .insert(cardSubscription)
      .values({ cardId: createdCard.id, ...subscription })
      .onConflictDoUpdate({
        target: cardSubscription.cardId,
        set: { ...subscription, updatedAt: now },
      });

    return {
      requestId: request.id,
      paymentId: payment.id,
      cardSlug: createdCard.slug,
    };
  });
}

export async function findCardRequest(requestId: string) {
  const [row] = await db
    .select()
    .from(cardRequest)
    .where(eq(cardRequest.id, requestId))
    .limit(1);
  return row ?? null;
}

/** Pending -> decided, guarded so two reviewers cannot both decide it. */
export async function decidePendingCardRequest(
  tx: Transaction,
  requestId: string,
  status: 'approved' | 'declined'
) {
  const [updated] = await tx
    .update(cardRequest)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(cardRequest.id, requestId), eq(cardRequest.status, 'pending')))
    .returning();
  return updated ?? null;
}

/** Approves the request's submitted payments and activates their card terms. */
export async function approveLinkedPayments(tx: Transaction, requestId: string) {
  const payments = await tx
    .update(subscriptionPayment)
    .set({ status: 'approved', updatedAt: new Date() })
    .where(and(linkedToRequest(requestId), eq(subscriptionPayment.status, 'submitted')))
    .returning({ id: subscriptionPayment.id });
  const paymentIds = payments.map((payment) => payment.id);
  if (!paymentIds.length) return paymentIds;

  const items = await tx
    .select()
    .from(subscriptionPaymentItem)
    .where(inArray(subscriptionPaymentItem.paymentId, paymentIds));
  for (const item of items) await activatePaidSubscription(tx, item);
  return paymentIds;
}

export async function rejectLinkedPayments(tx: Transaction, requestId: string) {
  const payments = await tx
    .update(subscriptionPayment)
    .set({ status: 'rejected', updatedAt: new Date() })
    .where(and(linkedToRequest(requestId), eq(subscriptionPayment.status, 'submitted')))
    .returning({ id: subscriptionPayment.id });
  return payments.map((payment) => payment.id);
}

/**
 * Requests submitted before cards were created at submission time: create the
 * card with an already-approved first-year payment on approval.
 */
export async function insertApprovedCardForLegacyRequest(
  tx: Transaction,
  input: {
    card: typeof card.$inferInsert;
    request: CardRequestRecord;
    organizationId: string;
    plan: { code: string; priceMinor: number; currency: string };
    term: { startAt: Date; endAt: Date };
  }
) {
  const [createdCard] = await tx
    .insert(card)
    .values(input.card)
    .returning({ id: card.id });
  const [payment] = await tx
    .insert(subscriptionPayment)
    .values({
      organizationId: input.organizationId,
      paidByUserId: input.request.userId,
      requestId: input.request.id,
      receiptUrl: input.request.paymentReceiptUrl,
      status: 'approved',
      note: `New design request (${input.request.id})`,
    })
    .returning({ id: subscriptionPayment.id });
  if (!createdCard || !payment) throw new Error('Legacy request card insert failed.');

  const [item] = await tx
    .insert(subscriptionPaymentItem)
    .values({
      paymentId: payment.id,
      cardId: createdCard.id,
      planCode: input.plan.code,
      termYears: 1,
      ...input.term,
      amountMinor: input.plan.priceMinor,
      currency: input.plan.currency,
    })
    .returning();
  if (item) await activatePaidSubscription(tx, item);
}

export async function findRequesterEmail(userId: string) {
  const [row] = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row?.email ?? null;
}

export async function listCardRequestsForReview(filter: {
  status?: string;
  limit: number;
  offset: number;
}) {
  const where = filter.status ? eq(cardRequest.status, filter.status) : undefined;
  const [rows, [totals]] = await Promise.all([
    db
      .select({
        request: cardRequest,
        requesterName: user.name,
        requesterEmail: user.email,
      })
      .from(cardRequest)
      .leftJoin(user, eq(user.id, cardRequest.userId))
      .where(where)
      .orderBy(desc(cardRequest.createdAt))
      .limit(filter.limit)
      .offset(filter.offset),
    db.select({ total: count() }).from(cardRequest).where(where),
  ]);

  const requestIds = rows.map((row) => row.request.id);
  const payments = requestIds.length
    ? await db
        .select({
          id: subscriptionPayment.id,
          requestId: subscriptionPayment.requestId,
          note: subscriptionPayment.note,
          status: subscriptionPayment.status,
          createdAt: subscriptionPayment.createdAt,
        })
        .from(subscriptionPayment)
        .where(
          or(
            inArray(subscriptionPayment.requestId, requestIds),
            inArray(subscriptionPayment.note, requestIds.flatMap(legacyRequestNotes))
          )
        )
    : [];

  return { rows, payments, total: totals?.total ?? 0 };
}
