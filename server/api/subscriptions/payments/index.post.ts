import { and, eq, inArray } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  card,
  cardRequest,
  cardSubscription,
  subscriptionPayment,
  subscriptionPaymentItem,
  subscriptionPlan,
} from '~~/server/db/schema';
import { assertOrganizationOwner } from '~~/server/services/subscription';
import { createSubscriptionPaymentBodySchema } from '~~/shared/types/subscription';
import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { env } from '~~/server/utils/env';

function addYears(base: Date, years: number) {
  const result = new Date(base);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

export default defineEventHandler(async (event) => {
  const session = await requireAdminSession(event);
  const organizationId = session.session.activeOrganizationId ?? null;
  if (!organizationId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }
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
  const existingSubscriptions = await db
    .select({
      cardId: cardSubscription.cardId,
      currentPeriodStartAt: cardSubscription.currentPeriodStartAt,
      currentPeriodEndAt: cardSubscription.currentPeriodEndAt,
    })
    .from(cardSubscription)
    .where(inArray(cardSubscription.cardId, cardIds));
  const subscriptionByCardId = new Map(
    existingSubscriptions.map((item) => [item.cardId, item])
  );
  const cardDetails = await db
    .select({
      id: card.id,
      firstName: card.firstName,
      lastName: card.lastName,
      position: card.position,
      company: card.company,
      phone: card.phone,
      email: card.email,
      website: card.website,
      socials: card.socials,
    })
    .from(card)
    .where(and(eq(card.organizationId, organizationId), inArray(card.id, cardIds)));
  const cardById = new Map(cardDetails.map((item) => [item.id, item]));

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
      const isPremiumUpgradePayment =
        body.data.createPremiumRequest === true && item.planCode === 'premium';
      if (body.data.createPremiumRequest === true && item.planCode !== 'premium') {
        throw createError({
          statusCode: 400,
          statusMessage: 'Premium upgrade requests must use premium plan.',
          data: {
            cardId: item.cardId,
            planCode: item.planCode,
          },
        });
      }

      const additionalFeeMinor = isPremiumUpgradePayment ? env.CUSTOM_DESIGN_FEE : 0;
      const baseAmountMinor = isPremiumUpgradePayment ? 0 : plan.priceMinor * termYears;
      const expectedAmountMinor = baseAmountMinor + additionalFeeMinor;
      const lineAmountMinor = expectedAmountMinor;
      const planCurrency = plan.currency.toUpperCase();
      const submittedCurrency = item.currency?.toUpperCase();
      const existingSubscription = subscriptionByCardId.get(item.cardId);
      const submittedAmountMinor =
        typeof item.amountMinor === 'number' ? item.amountMinor : undefined;

      if (lineAmountMinor < 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Submitted amount must be zero or positive.',
          data: {
            cardId: item.cardId,
            planCode: item.planCode,
            submittedAmountMinor: lineAmountMinor,
          },
        });
      }

      if (
        typeof submittedAmountMinor === 'number' &&
        submittedAmountMinor !== expectedAmountMinor
      ) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Submitted amount does not match expected pricing.',
          data: {
            cardId: item.cardId,
            planCode: item.planCode,
            submittedAmountMinor,
            expectedAmountMinor,
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

      let startAt: Date;
      let endAt: Date;

      if (item.skipPeriodUpdate) {
        if (
          !existingSubscription?.currentPeriodStartAt ||
          !existingSubscription?.currentPeriodEndAt
        ) {
          throw createError({
            statusCode: 400,
            statusMessage:
              'Cannot skip period update when the card has no active period.',
            data: { cardId: item.cardId },
          });
        }

        startAt = existingSubscription.currentPeriodStartAt;
        endAt = existingSubscription.currentPeriodEndAt;
      } else {
        const defaultStartAt =
          existingSubscription?.currentPeriodEndAt &&
          existingSubscription.currentPeriodEndAt > now
            ? existingSubscription.currentPeriodEndAt
            : now;
        startAt = item.startAt ?? defaultStartAt;
        endAt = item.endAt ?? addYears(startAt, termYears);
      }

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
        amountMinor: lineAmountMinor,
        currency: planCurrency,
      };
    });

    const insertedItems = await tx
      .insert(subscriptionPaymentItem)
      .values(paymentItemValues)
      .returning();

    let createdRequestId: string | null = null;
    if (body.data.createPremiumRequest) {
      if (insertedItems.length !== 1) {
        throw createError({
          statusCode: 400,
          statusMessage:
            'Premium upgrade request creation supports one card per payment.',
        });
      }

      const item = insertedItems[0]!;
      const sourceCard = cardById.get(item.cardId);
      const name = sourceCard
        ? `${sourceCard.firstName} ${sourceCard.lastName || ''}`.trim()
        : undefined;

      const [request] = await tx
        .insert(cardRequest)
        .values({
          type: 'existing_design',
          status: 'pending',
          paymentReceiptUrl: body.data.receiptUrl,
          userId: session.user.id,
          cardData: {
            name,
            position: sourceCard?.position || undefined,
            company: sourceCard?.company || undefined,
            phone: sourceCard?.phone || undefined,
            email: sourceCard?.email || undefined,
            website: sourceCard?.website || undefined,
            socials: sourceCard?.socials || [],
            sourceCardId: item.cardId,
          },
        })
        .returning({ id: cardRequest.id });

      createdRequestId = request.id;
      await tx
        .update(subscriptionPayment)
        .set({
          requestId: createdRequestId,
          note: `Existing design request (${createdRequestId})`,
          updatedAt: now,
        })
        .where(eq(subscriptionPayment.id, payment.id));
    }

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

    return {
      payment: createdRequestId
        ? { ...payment, note: `Existing design request (${createdRequestId})` }
        : payment,
      items: insertedItems,
      requestId: createdRequestId,
    };
  });

  return result;
});
