import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import {
  card,
  cardRequest,
  cardSubscription,
  subscriptionPayment,
  subscriptionPlan,
  subscriptionPaymentItem,
} from '~~/server/db/schema';
import { splitName } from '~~/server/services/card';
import { getPersonalOrganizationByUserId } from '~~/server/services/auth';
import { env } from '~~/server/utils/env';

const NEW_DESIGN_DEFAULT_PLAN_CODE = 'standard';

function addYears(base: Date, years: number) {
  const result = new Date(base);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const requestId = getRouterParam(event, 'id');
  if (!requestId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Request id is required.',
    });
  }

  const existing = await db.query.cardRequest.findFirst({
    where: eq(cardRequest.id, requestId),
    columns: {
      id: true,
      type: true,
      status: true,
      paymentReceiptUrl: true,
      cardData: true,
      userId: true,
    },
  });

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Request not found.' });
  }

  if (existing.status !== 'pending') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only pending requests can be approved.',
    });
  }

  const now = new Date();
  if (!existing.paymentReceiptUrl?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Cannot approve request without payment receipt.',
    });
  }

  const payload = await db.transaction(async (tx) => {
    const [approved] = await tx
      .update(cardRequest)
      .set({ status: 'approved', updatedAt: now })
      .where(and(eq(cardRequest.id, requestId), eq(cardRequest.status, 'pending')))
      .returning();

    if (existing.type === 'new_design') {
      const ownerOrg = await getPersonalOrganizationByUserId(existing.userId);
      if (!ownerOrg) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Request owner has no personal organization.',
        });
      }

      const planRows = await tx
        .select({
          code: subscriptionPlan.code,
          priceMinor: subscriptionPlan.priceMinor,
          currency: subscriptionPlan.currency,
        })
        .from(subscriptionPlan)
        .where(
          and(
            eq(subscriptionPlan.code, NEW_DESIGN_DEFAULT_PLAN_CODE),
            eq(subscriptionPlan.isActive, true)
          )
        )
        .limit(1);
      const plan = planRows[0];

      if (!plan) {
        throw createError({
          statusCode: 400,
          statusMessage: `Active plan "${NEW_DESIGN_DEFAULT_PLAN_CODE}" not found.`,
        });
      }

      const requestCardData = existing.cardData || {};
      const { firstName, lastName } = splitName(requestCardData.name);

      const [createdCard] = await tx
        .insert(card)
        .values({
          firstName,
          lastName,
          slug: `${slugify(requestCardData.name || `${firstName} ${lastName}`)}-${nanoid(6)}`,
          position: requestCardData.position || 'Professional',
          company: requestCardData.company || null,
          phone: requestCardData.phone || null,
          email: requestCardData.email || null,
          website: requestCardData.website || null,
          socials: requestCardData.socials || [],
          splineUrl: env.DEFAULT_SPLINE_URL,
          organizationId: ownerOrg.id,
          userId: existing.userId,
          type: 'standard',
        })
        .returning();

      const [payment] = await tx
        .insert(subscriptionPayment)
        .values({
          organizationId: ownerOrg.id,
          paidByUserId: existing.userId,
          receiptUrl: existing.paymentReceiptUrl,
          status: 'approved',
          note: `New design request (${requestId})`,
        })
        .returning();

      const [paymentItem] = await tx
        .insert(subscriptionPaymentItem)
        .values({
          paymentId: payment.id,
          cardId: createdCard.id,
          planCode: plan.code,
          termYears: 1,
          startAt: now,
          endAt: addYears(now, 1),
          amountMinor: plan.priceMinor,
          currency: plan.currency,
        })
        .returning();

      await tx
        .insert(cardSubscription)
        .values({
          cardId: createdCard.id,
          planCode: plan.code,
          status: 'active',
          isTrial: false,
          currentPeriodStartAt: paymentItem.startAt,
          currentPeriodEndAt: paymentItem.endAt,
          lastPaymentItemId: paymentItem.id,
          activatedAt: now,
          expiredAt: null,
        })
        .onConflictDoUpdate({
          target: cardSubscription.cardId,
          set: {
            planCode: plan.code,
            status: 'active',
            isTrial: false,
            currentPeriodStartAt: paymentItem.startAt,
            currentPeriodEndAt: paymentItem.endAt,
            lastPaymentItemId: paymentItem.id,
            activatedAt: now,
            expiredAt: null,
            updatedAt: now,
          },
        });

      return approved;
    }

    const requestNote = `Existing design request (${requestId})`;
    const payments = await tx
      .select({ id: subscriptionPayment.id })
      .from(subscriptionPayment)
      .where(
        and(
          eq(subscriptionPayment.note, requestNote),
          eq(subscriptionPayment.status, 'submitted')
        )
      );

    const paymentIds = payments.map((payment) => payment.id);

    if (paymentIds.length > 0) {
      await tx
        .update(subscriptionPayment)
        .set({ status: 'approved', updatedAt: now })
        .where(eq(subscriptionPayment.note, requestNote));

      for (const paymentId of paymentIds) {
        const items = await tx
          .select({
            id: subscriptionPaymentItem.id,
            cardId: subscriptionPaymentItem.cardId,
            planCode: subscriptionPaymentItem.planCode,
            startAt: subscriptionPaymentItem.startAt,
            endAt: subscriptionPaymentItem.endAt,
          })
          .from(subscriptionPaymentItem)
          .where(eq(subscriptionPaymentItem.paymentId, paymentId));

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
      }
    }

    return approved;
  });

  return payload;
});
