import { and, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  findCardByIdAndOrganization,
  findCardSubscriptionByCardId,
} from '~~/server/db/queries/subscription';
import { member } from '~~/server/db/schema';
import { requireOrganizationSession } from '~~/server/utils/organization-permissions';
import {
  ensureCardTrialSubscription,
  getDaysLeft,
  getEffectiveSubscriptionStatus,
} from '~~/server/services/subscription';

export default defineEventHandler(async (event) => {
  const session = await requireOrganizationSession(event);

  const organizationId = session.session.activeOrganizationId;
  const userId = session.user.id;
  const cardId = getRouterParam(event, 'cardId');

  if (!cardId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Card ID is required.',
    });
  }

  const membership = await db.query.member.findFirst({
    where: and(eq(member.userId, userId), eq(member.organizationId, organizationId)),
  });

  if (!membership) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    });
  }

  const cardRecord = await findCardByIdAndOrganization(cardId, organizationId);
  if (!cardRecord) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Card not found in active organization.',
    });
  }

  const rawSubscription =
    (await findCardSubscriptionByCardId(cardId)) ??
    (await ensureCardTrialSubscription(cardId, cardRecord.createdAt));

  const effectiveStatus = getEffectiveSubscriptionStatus(
    rawSubscription.status,
    rawSubscription.trialEndAt,
    rawSubscription.currentPeriodEndAt
  );

  const endAt =
    effectiveStatus === 'trial'
      ? rawSubscription.trialEndAt
      : rawSubscription.currentPeriodEndAt;

  return {
    cardId,
    organizationId,
    subscription: {
      ...rawSubscription,
      effectiveStatus,
    },
    isExpired: effectiveStatus === 'expired',
    daysLeft: getDaysLeft(endAt),
  };
});
