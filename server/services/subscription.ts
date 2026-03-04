import { and, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { card, cardSubscription, member } from '~~/server/db/schema';

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

export function getDaysLeft(endAt?: Date | null) {
  if (!endAt) return null;

  const diff = endAt.getTime() - Date.now();
  if (diff <= 0) return 0;

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
