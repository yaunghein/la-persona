import { and, eq, isNotNull, isNull, ne, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  card,
  cardSubscription,
  organization,
  subscriptionPayment,
  subscriptionPaymentItem,
} from '../db/schema';
import { ORGANIZATION_TYPES } from '../../shared/utils/constants';

/**
 * One approved 0 MMK payment for each claimed personal card that has a period
 * and no matching payment item. A stored current period is copied as-is. The
 * automatic trial, which has trial dates and no plan, is recorded as Standard.
 * The payment is dated on the period start, so it lands in that month's revenue.
 * Does not change the subscription, so the card still shows as a trial.
 */
async function main() {
  const currentPeriods = await db
    .select({
      cardId: card.id,
      organizationId: card.organizationId,
      userId: card.userId,
      planCode: cardSubscription.planCode,
      startAt: cardSubscription.currentPeriodStartAt,
      endAt: cardSubscription.currentPeriodEndAt,
    })
    .from(card)
    .innerJoin(cardSubscription, eq(cardSubscription.cardId, card.id))
    .innerJoin(organization, eq(organization.id, card.organizationId))
    .where(
      and(
        isNotNull(card.userId),
        isNotNull(cardSubscription.planCode),
        isNotNull(cardSubscription.currentPeriodStartAt),
        isNotNull(cardSubscription.currentPeriodEndAt),
        ne(organization.type, ORGANIZATION_TYPES.COMMUNITY)
      )
    );

  const trials = await db
    .select({
      cardId: card.id,
      organizationId: card.organizationId,
      userId: card.userId,
      startAt: cardSubscription.trialStartAt,
      endAt: cardSubscription.trialEndAt,
    })
    .from(card)
    .innerJoin(cardSubscription, eq(cardSubscription.cardId, card.id))
    .innerJoin(organization, eq(organization.id, card.organizationId))
    .where(
      and(
        isNotNull(card.userId),
        isNull(cardSubscription.planCode),
        isNull(cardSubscription.currentPeriodStartAt),
        isNull(cardSubscription.currentPeriodEndAt),
        isNotNull(cardSubscription.trialStartAt),
        isNotNull(cardSubscription.trialEndAt),
        ne(organization.type, ORGANIZATION_TYPES.COMMUNITY)
      )
    );

  const promoted = await db
    .update(subscriptionPayment)
    .set({
      status: 'approved',
      updatedAt: sql`${subscriptionPayment.updatedAt}`,
    })
    .where(eq(subscriptionPayment.status, 'trial'))
    .returning({ id: subscriptionPayment.id });

  const rows = [
    ...currentPeriods.flatMap((row) =>
      row.userId && row.planCode && row.startAt && row.endAt
        ? [
            {
              cardId: row.cardId,
              organizationId: row.organizationId,
              userId: row.userId,
              planCode: row.planCode,
              startAt: row.startAt,
              endAt: row.endAt,
            },
          ]
        : []
    ),
    ...trials.flatMap((row) =>
      row.userId && row.startAt && row.endAt
        ? [
            {
              cardId: row.cardId,
              organizationId: row.organizationId,
              userId: row.userId,
              planCode: 'standard',
              startAt: row.startAt,
              endAt: row.endAt,
            },
          ]
        : []
    ),
  ];

  let inserted = 0;

  for (const row of rows) {
    const existing = await db
      .select({ id: subscriptionPaymentItem.id })
      .from(subscriptionPaymentItem)
      .where(
        and(
          eq(subscriptionPaymentItem.cardId, row.cardId),
          eq(subscriptionPaymentItem.startAt, row.startAt),
          eq(subscriptionPaymentItem.endAt, row.endAt)
        )
      )
      .limit(1);
    if (existing.length > 0) continue;

    const [payment] = await db
      .insert(subscriptionPayment)
      .values({
        organizationId: row.organizationId,
        paidByUserId: row.userId,
        receiptUrl: null,
        paymentMethod: 'system',
        status: 'approved',
        createdAt: row.startAt,
        updatedAt: row.startAt,
      })
      .returning({ id: subscriptionPayment.id });
    if (!payment) continue;

    await db.insert(subscriptionPaymentItem).values({
      paymentId: payment.id,
      cardId: row.cardId,
      planCode: row.planCode,
      startAt: row.startAt,
      endAt: row.endAt,
      amountMinor: 0,
      currency: 'MMK',
    });
    inserted += 1;
  }

  console.log(
    `[backfill-subscription-history] candidates=${rows.length} inserted=${inserted} promoted=${promoted.length}`
  );
}

main();
