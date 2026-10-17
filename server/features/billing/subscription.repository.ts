import { and, eq, inArray } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  cardSubscription,
  subscriptionPayment,
  subscriptionPaymentItem,
} from '~~/server/db/schema';
import type { Transaction } from '~~/server/features/billing/billing.repository';
import { TRIAL_LENGTH_DAYS } from '~~/server/features/billing/card-subscription-state';
import type { SubscriptionStatus } from '~~/shared/utils/subscription';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Starts the card's 30-day trial (no-op if it already has a subscription). */
export async function ensureCardTrialSubscription(
  cardId: string,
  cardCreatedAt: Date
) {
  const now = new Date();
  const trialEndAt = new Date(
    cardCreatedAt.getTime() + TRIAL_LENGTH_DAYS * DAY_MS
  );
  const status: SubscriptionStatus = trialEndAt > now ? 'trial' : 'expired';
  await db
    .insert(cardSubscription)
    .values({
      cardId,
      status,
      isTrial: true,
      trialStartAt: cardCreatedAt,
      trialEndAt,
      expiredAt: status === 'expired' ? now : null,
    })
    .onConflictDoNothing({ target: cardSubscription.cardId });
}

/** What a subscription falls back to once a pending payment is rejected. */
function statusWithoutPendingPayment(
  subscription: {
    isTrial: boolean;
    trialEndAt: Date | null;
    currentPeriodEndAt: Date | null;
    activatedAt: Date | null;
  },
  now: Date
): SubscriptionStatus {
  if (subscription.activatedAt) {
    return !subscription.currentPeriodEndAt ||
      subscription.currentPeriodEndAt > now
      ? 'active'
      : 'expired';
  }
  if (subscription.isTrial && subscription.trialEndAt) {
    return subscription.trialEndAt > now ? 'trial' : 'expired';
  }
  return 'expired';
}

/** After rejecting payments, cards without another submitted payment leave `pending_approval`. */
export async function restoreSubscriptionsAfterRejection(
  tx: Transaction,
  paymentIds: string[],
  now = new Date()
) {
  if (!paymentIds.length) return;

  const items = await tx
    .select({ cardId: subscriptionPaymentItem.cardId })
    .from(subscriptionPaymentItem)
    .where(inArray(subscriptionPaymentItem.paymentId, paymentIds));
  const cardIds = [...new Set(items.map((item) => item.cardId))];
  if (!cardIds.length) return;

  const stillPending = await tx
    .select({ cardId: subscriptionPaymentItem.cardId })
    .from(subscriptionPaymentItem)
    .innerJoin(
      subscriptionPayment,
      eq(subscriptionPayment.id, subscriptionPaymentItem.paymentId)
    )
    .where(
      and(
        inArray(subscriptionPaymentItem.cardId, cardIds),
        eq(subscriptionPayment.status, 'submitted')
      )
    );
  const stillPendingCardIds = new Set(stillPending.map((row) => row.cardId));

  const subscriptions = await tx
    .select()
    .from(cardSubscription)
    .where(
      and(
        inArray(cardSubscription.cardId, cardIds),
        eq(cardSubscription.status, 'pending_approval')
      )
    );

  for (const subscription of subscriptions) {
    if (stillPendingCardIds.has(subscription.cardId)) continue;
    const status = statusWithoutPendingPayment(subscription, now);
    await tx
      .update(cardSubscription)
      .set({
        status,
        expiredAt: status === 'expired' ? now : null,
        updatedAt: now,
      })
      .where(eq(cardSubscription.id, subscription.id));
  }
}
