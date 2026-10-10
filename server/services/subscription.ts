import { and, eq, inArray, lte, or } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  card,
  cardSubscription,
  member,
  subscriptionPayment,
  subscriptionPaymentItem,
} from '~~/server/db/schema';

export type SubscriptionStatus =
  | 'trial'
  | 'active'
  | 'grace'
  | 'expired'
  | 'pending_approval'
  | 'submitted'
  | 'rejected';

function addDays(base: Date, days: number) {
  const result = new Date(base);
  result.setDate(result.getDate() + days);
  return result;
}

export async function assertOrganizationOwner(userId: string, organizationId: string) {
  const membership = await db.query.member.findFirst({
    where: and(eq(member.userId, userId), eq(member.organizationId, organizationId)),
  });

  if (!membership || membership.role !== 'owner') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only organization owners can perform this action.',
    });
  }

  return membership;
}

export async function ensureCardTrialSubscription(
  cardId: string,
  cardCreatedAt?: Date
) {
  const now = new Date();

  const cardRecord =
    cardCreatedAt
      ? { createdAt: cardCreatedAt }
      : await db.query.card.findFirst({
          where: eq(card.id, cardId),
          columns: { createdAt: true },
        });

  if (!cardRecord) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Card not found.',
    });
  }

  const trialStartAt = cardRecord.createdAt;
  const trialEndAt = addDays(trialStartAt, 30);
  const status: SubscriptionStatus = trialEndAt > now ? 'trial' : 'expired';

  await db
    .insert(cardSubscription)
    .values({
      cardId,
      status,
      isTrial: true,
      trialStartAt,
      trialEndAt,
      expiredAt: status === 'expired' ? now : null,
    })
    .onConflictDoNothing({ target: cardSubscription.cardId });

  const subscription = await db.query.cardSubscription.findFirst({
    where: eq(cardSubscription.cardId, cardId),
  });

  if (!subscription) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to initialize card subscription.',
    });
  }

  return subscription;
}

export function getEffectiveSubscriptionStatus(
  status: string,
  trialEndAt?: Date | null,
  currentPeriodEndAt?: Date | null
): SubscriptionStatus {
  const now = new Date();

  if (status === 'trial' && trialEndAt && trialEndAt <= now) {
    return 'expired';
  }

  if (
    (status === 'active' || status === 'grace') &&
    currentPeriodEndAt &&
    currentPeriodEndAt <= now
  ) {
    return 'expired';
  }

  return status as SubscriptionStatus;
}

export function resolveSubscriptionStatus(
  subscription: {
    isTrial: boolean;
    trialEndAt: Date | null;
    currentPeriodEndAt: Date | null;
    activatedAt: Date | null;
  },
  now = new Date()
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

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Call after marking payments rejected so their cards leave `pending_approval`. */
export async function restoreSubscriptionsAfterRejection(
  tx: Transaction,
  paymentIds: string[],
  now = new Date()
) {
  if (paymentIds.length === 0) return;

  const items = await tx
    .select({ cardId: subscriptionPaymentItem.cardId })
    .from(subscriptionPaymentItem)
    .where(inArray(subscriptionPaymentItem.paymentId, paymentIds));
  const cardIds = [...new Set(items.map((item) => item.cardId))];
  if (cardIds.length === 0) return;

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
    const status = resolveSubscriptionStatus(subscription, now);
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

const EXPIRE_SWEEP_INTERVAL_MS = 60_000;
let lastExpireSweepAt = 0;

export async function expireStaleSubscriptions() {
  const now = new Date();
  if (now.getTime() - lastExpireSweepAt < EXPIRE_SWEEP_INTERVAL_MS) return;
  lastExpireSweepAt = now.getTime();

  await db
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
    );
}

export function getDaysLeft(endAt?: Date | null) {
  if (!endAt) return null;

  const diff = endAt.getTime() - Date.now();
  if (diff <= 0) return 0;

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
