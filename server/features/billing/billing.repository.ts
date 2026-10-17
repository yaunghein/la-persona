import { and, asc, count, desc, eq, inArray, lte, or } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  cardRequest,
  cardSubscription,
  subscriptionPayment,
  subscriptionPaymentItem,
  subscriptionPlan,
  user,
} from '~~/server/db/schema';

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function listSubscriptionPlans() {
  return db
    .select({
      code: subscriptionPlan.code,
      name: subscriptionPlan.name,
      billingCycle: subscriptionPlan.billingCycle,
      priceMinor: subscriptionPlan.priceMinor,
      currency: subscriptionPlan.currency,
      isActive: subscriptionPlan.isActive,
    })
    .from(subscriptionPlan)
    .orderBy(asc(subscriptionPlan.priceMinor));
}

export function listActivePlansByCode(codes: string[]) {
  return db
    .select({
      code: subscriptionPlan.code,
      priceMinor: subscriptionPlan.priceMinor,
      currency: subscriptionPlan.currency,
    })
    .from(subscriptionPlan)
    .where(
      and(
        inArray(subscriptionPlan.code, codes),
        eq(subscriptionPlan.isActive, true)
      )
    );
}

export function runInTransaction<T>(work: (tx: Transaction) => Promise<T>) {
  return db.transaction(work);
}

export async function findCardSubscription(cardId: string) {
  const [row] = await db
    .select()
    .from(cardSubscription)
    .where(eq(cardSubscription.cardId, cardId))
    .limit(1);
  return row ?? null;
}

/** Card payment: one submitted payment, one line, the card marked pending approval. */
export async function insertCardPayment(input: {
  organizationId: string;
  paidByUserId: string;
  receiptUrl: string;
  note: string;
  line: {
    cardId: string;
    planCode: string;
    startAt: Date;
    endAt: Date;
    amountMinor: number;
    currency: string;
  };
  /** Premium upgrades also open a design request for the card. */
  designRequest: typeof cardRequest.$inferInsert | null;
}) {
  const now = new Date();
  return db.transaction(async (tx) => {
    const [payment] = await tx
      .insert(subscriptionPayment)
      .values({
        organizationId: input.organizationId,
        paidByUserId: input.paidByUserId,
        receiptUrl: input.receiptUrl,
        note: input.note,
        status: 'submitted',
      })
      .returning({ id: subscriptionPayment.id });
    if (!payment) throw new Error('Payment insert returned no row.');

    await tx.insert(subscriptionPaymentItem).values({
      paymentId: payment.id,
      termYears: 1,
      ...input.line,
    });

    let cardRequestId: string | null = null;
    if (input.designRequest) {
      const [request] = await tx
        .insert(cardRequest)
        .values(input.designRequest)
        .returning({ id: cardRequest.id });
      cardRequestId = request?.id ?? null;
      await tx
        .update(subscriptionPayment)
        .set({
          requestId: cardRequestId,
          note: `Existing design request (${cardRequestId})`,
          updatedAt: now,
        })
        .where(eq(subscriptionPayment.id, payment.id));
    }

    // Plan and period are applied on approval so a rejection leaves the card untouched.
    await tx
      .insert(cardSubscription)
      .values({
        cardId: input.line.cardId,
        status: 'pending_approval',
        isTrial: false,
      })
      .onConflictDoUpdate({
        target: cardSubscription.cardId,
        set: { status: 'pending_approval', updatedAt: now },
      });

    return { paymentId: payment.id, cardRequestId };
  });
}

/** Line items of an organization's payments, newest term first. */
export function listOrganizationBillingHistory(organizationId: string) {
  return db
    .select({
      paymentId: subscriptionPayment.id,
      paymentStatus: subscriptionPayment.status,
      paymentCreatedAt: subscriptionPayment.createdAt,
      paymentUpdatedAt: subscriptionPayment.updatedAt,
      itemId: subscriptionPaymentItem.id,
      planCode: subscriptionPaymentItem.planCode,
      amountMinor: subscriptionPaymentItem.amountMinor,
      currency: subscriptionPaymentItem.currency,
      startAt: subscriptionPaymentItem.startAt,
      endAt: subscriptionPaymentItem.endAt,
      planName: subscriptionPlan.name,
    })
    .from(subscriptionPaymentItem)
    .innerJoin(
      subscriptionPayment,
      eq(subscriptionPayment.id, subscriptionPaymentItem.paymentId)
    )
    .leftJoin(
      subscriptionPlan,
      eq(subscriptionPlan.code, subscriptionPaymentItem.planCode)
    )
    .where(eq(subscriptionPayment.organizationId, organizationId))
    .orderBy(
      desc(subscriptionPaymentItem.endAt),
      desc(subscriptionPayment.createdAt)
    );
}

export async function findPayer(userId: string) {
  const [row] = await db
    .select({ email: user.email, name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row ?? null;
}

export async function findPaymentForReview(tx: Transaction, paymentId: string) {
  const [payment] = await tx
    .select()
    .from(subscriptionPayment)
    .where(eq(subscriptionPayment.id, paymentId))
    .limit(1);
  return payment ?? null;
}

export function listPaymentItems(tx: Transaction, paymentId: string) {
  return tx
    .select()
    .from(subscriptionPaymentItem)
    .where(eq(subscriptionPaymentItem.paymentId, paymentId));
}

/** Moves a submitted payment to its decision; null if someone decided it first. */
export async function decideSubmittedPayment(
  tx: Transaction,
  paymentId: string,
  decision: { status: 'approved' | 'rejected'; note: string | null }
) {
  const [updated] = await tx
    .update(subscriptionPayment)
    .set({ ...decision, updatedAt: new Date() })
    .where(
      and(
        eq(subscriptionPayment.id, paymentId),
        eq(subscriptionPayment.status, 'submitted')
      )
    )
    .returning();
  return updated ?? null;
}

export async function activatePaidSubscription(
  tx: Transaction,
  item: typeof subscriptionPaymentItem.$inferSelect,
  now = new Date()
) {
  const values = {
    planCode: item.planCode,
    status: 'active',
    isTrial: false,
    currentPeriodStartAt: item.startAt,
    currentPeriodEndAt: item.endAt,
    lastPaymentItemId: item.id,
    activatedAt: now,
    expiredAt: null,
  };
  await tx
    .insert(cardSubscription)
    .values({ cardId: item.cardId, ...values })
    .onConflictDoUpdate({
      target: cardSubscription.cardId,
      set: { ...values, updatedAt: now },
    });
}

/** Persists expiry for trials and paid periods that have ended. */
export async function expireLapsedSubscriptions(now = new Date()) {
  const expired = await db
    .update(cardSubscription)
    .set({ status: 'expired', expiredAt: now, updatedAt: now })
    .where(
      or(
        and(
          eq(cardSubscription.status, 'trial'),
          lte(cardSubscription.trialEndAt, now)
        ),
        and(
          inArray(cardSubscription.status, ['active', 'grace']),
          lte(cardSubscription.currentPeriodEndAt, now)
        )
      )
    )
    .returning({ id: cardSubscription.id });
  return expired.length;
}

export async function countSubmittedPayments() {
  const [row] = await db
    .select({ value: count() })
    .from(subscriptionPayment)
    .where(eq(subscriptionPayment.status, 'submitted'));
  return Number(row?.value ?? 0);
}

const LINKED_REQUEST_ID = /^(?:New|Existing) design request \(([^)]+)\)$/;

/** Card request linked to a payment (by column, or the legacy note format). */
export function linkedCardRequestId(payment: {
  requestId: string | null;
  note: string | null;
}) {
  return (
    payment.requestId || payment.note?.match(LINKED_REQUEST_ID)?.[1] || null
  );
}

export async function listPaymentsForReview(filter: {
  status?: string;
  limit: number;
  offset: number;
}) {
  const where = filter.status
    ? eq(subscriptionPayment.status, filter.status)
    : undefined;
  const [payments, [totals]] = await Promise.all([
    db
      .select({
        payment: subscriptionPayment,
        payerName: user.name,
        payerEmail: user.email,
      })
      .from(subscriptionPayment)
      .leftJoin(user, eq(user.id, subscriptionPayment.paidByUserId))
      .where(where)
      .orderBy(desc(subscriptionPayment.createdAt))
      .limit(filter.limit)
      .offset(filter.offset),
    db.select({ total: count() }).from(subscriptionPayment).where(where),
  ]);

  const paymentIds = payments.map((row) => row.payment.id);
  const requestIds = payments
    .map((row) => linkedCardRequestId(row.payment))
    .filter((id): id is string => !!id);

  const [items, requests] = await Promise.all([
    paymentIds.length
      ? db
          .select()
          .from(subscriptionPaymentItem)
          .where(inArray(subscriptionPaymentItem.paymentId, paymentIds))
      : Promise.resolve([]),
    requestIds.length
      ? db
          .select({ id: cardRequest.id, status: cardRequest.status })
          .from(cardRequest)
          .where(inArray(cardRequest.id, requestIds))
      : Promise.resolve([]),
  ]);

  return { payments, items, requests, total: totals?.total ?? 0 };
}
