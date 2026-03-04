import { and, eq, inArray } from 'drizzle-orm';
import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import {
  card,
  cardSubscription,
  subscriptionPayment,
  subscriptionPaymentItem,
  subscriptionPlan,
} from '~~/server/db/schema';
import { assertOrganizationOwner } from '~~/server/services/subscription';
import { createSubscriptionPaymentBodySchema } from '~~/shared/types/subscription';

function addYears(base: Date, years: number) {
  const result = new Date(base);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session || !session.session.activeOrganizationId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const organizationId = session.session.activeOrganizationId;
  await assertOrganizationOwner(session.user.id, organizationId);

  const body = await readValidatedBody(
    event,
    createSubscriptionPaymentBodySchema.safeParse
  );

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: body.error.issues,
    });
  }

  const cardIds = body.data.items.map((item) => item.cardId);
  const cardsInOrg = await db
    .select({ id: card.id })
    .from(card)
    .where(and(eq(card.organizationId, organizationId), inArray(card.id, cardIds)));

  const validCardIds = new Set(cardsInOrg.map((row) => row.id));
  const missingCardIds = cardIds.filter((id) => !validCardIds.has(id));
  if (missingCardIds.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Some cards are not in your organization.',
      data: { missingCardIds },
    });
  }

  const planCodes = [...new Set(body.data.items.map((item) => item.planCode))];
  const plans = await db
    .select({
      code: subscriptionPlan.code,
      priceMinor: subscriptionPlan.priceMinor,
      currency: subscriptionPlan.currency,
      isActive: subscriptionPlan.isActive,
    })
    .from(subscriptionPlan)
    .where(inArray(subscriptionPlan.code, planCodes));

  const planByCode = new Map(plans.map((plan) => [plan.code, plan]));
  const missingPlanCodes = planCodes.filter((code) => !planByCode.has(code));
  if (missingPlanCodes.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Some plan codes are invalid.',
      data: { missingPlanCodes },
    });
  }

  const inactivePlanCodes = plans
    .filter((plan) => !plan.isActive)
    .map((plan) => plan.code);
  if (inactivePlanCodes.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Some selected plans are inactive.',
      data: { inactivePlanCodes },
    });
  }

  const now = new Date();

  const result = await db.transaction(async (tx) => {
    const [payment] = await tx
      .insert(subscriptionPayment)
      .values({
        organizationId,
        paidByUserId: session.user.id,
        receiptUrl: body.data.receiptUrl,
        paymentReference: body.data.paymentReference,
        paymentMethod: body.data.paymentMethod,
        note: body.data.note,
        status: 'submitted',
      })
      .returning();

    const paymentItemValues = body.data.items.map((item) => {
      const plan = planByCode.get(item.planCode);
      if (!plan) {
        throw createError({
          statusCode: 400,
          statusMessage: `Plan not found for code: ${item.planCode}`,
        });
      }

      const termYears = item.termYears ?? 1;
      const expectedAmountMinor = plan.priceMinor * termYears;
      const planCurrency = plan.currency.toUpperCase();
      const submittedCurrency = item.currency?.toUpperCase();

      if (
        item.amountMinor !== undefined &&
        item.amountMinor !== expectedAmountMinor
      ) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Submitted amount does not match plan pricing.',
          data: {
            cardId: item.cardId,
            planCode: item.planCode,
            expectedAmountMinor,
            submittedAmountMinor: item.amountMinor,
          },
        });
      }

      if (submittedCurrency && submittedCurrency !== planCurrency) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Submitted currency does not match plan currency.',
          data: {
            cardId: item.cardId,
            planCode: item.planCode,
            expectedCurrency: planCurrency,
            submittedCurrency,
          },
        });
      }

      const startAt = item.startAt ?? now;
      const endAt = item.endAt ?? addYears(startAt, termYears);

      if (endAt <= startAt) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Each line item end date must be after start date.',
        });
      }

      return {
        paymentId: payment.id,
        cardId: item.cardId,
        planCode: item.planCode,
        termYears,
        startAt,
        endAt,
        amountMinor: expectedAmountMinor,
        currency: planCurrency,
      };
    });

    const insertedItems = await tx
      .insert(subscriptionPaymentItem)
      .values(paymentItemValues)
      .returning();

    for (const item of insertedItems) {
      await tx
        .insert(cardSubscription)
        .values({
          cardId: item.cardId,
          planCode: item.planCode,
          status: 'pending_approval',
          isTrial: false,
          currentPeriodStartAt: item.startAt,
          currentPeriodEndAt: item.endAt,
          lastPaymentItemId: item.id,
          activatedAt: null,
          expiredAt: null,
        })
        .onConflictDoUpdate({
          target: cardSubscription.cardId,
          set: {
            planCode: item.planCode,
            status: 'pending_approval',
            isTrial: false,
            currentPeriodStartAt: item.startAt,
            currentPeriodEndAt: item.endAt,
            lastPaymentItemId: item.id,
            activatedAt: null,
            expiredAt: null,
            updatedAt: now,
          },
        });
    }

    return { payment, items: insertedItems };
  });

  return result;
});
