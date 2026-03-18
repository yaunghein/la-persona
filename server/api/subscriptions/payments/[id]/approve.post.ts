import { and, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  cardSubscription,
  subscriptionPayment,
  subscriptionPaymentItem,
} from '~~/server/db/schema';
import { assertOrganizationOwner } from '~~/server/services/subscription';
import { approveSubscriptionPaymentBodySchema } from '~~/shared/types/subscription';
import { requireAdminSession } from '~~/server/utils/admin-permissions';

export default defineEventHandler(async (event) => {
  const session = await requireAdminSession(event);
  if (!session || !session.session.activeOrganizationId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const organizationId = session.session.activeOrganizationId;
  await assertOrganizationOwner(session.user.id, organizationId);

  const result = await readValidatedBody(
    event,
    approveSubscriptionPaymentBodySchema.safeParse
  );
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: result.error.issues,
    });
  }

  const paymentId = getRouterParam(event, 'id');
  if (!paymentId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Payment ID is required.',
    });
  }

  const now = new Date();

  const payload = await db.transaction(async (tx) => {
    const payment = await tx.query.subscriptionPayment.findFirst({
      where: and(
        eq(subscriptionPayment.id, paymentId),
        eq(subscriptionPayment.organizationId, organizationId)
      ),
    });

    if (!payment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Payment not found.',
      });
    }

    const isLegacyLinkedByNote = /^((New|Existing) design request \([^)]+\))$/.test(
      payment.note || ''
    );
    const isLinkedDesignRequest =
      Boolean(payment.requestId) || isLegacyLinkedByNote;
    if (isLinkedDesignRequest) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'This payment is linked to a card request. Approve it from the Requests page.',
      });
    }

    const items = await tx.query.subscriptionPaymentItem.findMany({
      where: eq(subscriptionPaymentItem.paymentId, payment.id),
    });

    if (items.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Payment has no subscription items.',
      });
    }

    const [updatedPayment] = await tx
      .update(subscriptionPayment)
      .set({
        status: 'approved',
        note: result.data.note ?? payment.note,
        updatedAt: now,
      })
      .where(eq(subscriptionPayment.id, payment.id))
      .returning();

    for (const item of items) {
      await tx
        .insert(cardSubscription)
        .values({
          cardId: item.cardId,
          planCode: item.planCode,
          status: 'active',
          isTrial: false,
          currentPeriodStartAt: item.startAt,
          currentPeriodEndAt: item.endAt,
          lastPaymentItemId: item.id,
          activatedAt: now,
          expiredAt: null,
        })
        .onConflictDoUpdate({
          target: cardSubscription.cardId,
          set: {
            planCode: item.planCode,
            status: 'active',
            isTrial: false,
            currentPeriodStartAt: item.startAt,
            currentPeriodEndAt: item.endAt,
            lastPaymentItemId: item.id,
            activatedAt: now,
            expiredAt: null,
            updatedAt: now,
          },
        });
    }

    return {
      payment: updatedPayment,
      updatedCardsCount: items.length,
    };
  });

  return payload;
});
