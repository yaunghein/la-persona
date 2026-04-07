import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import {
  card,
  cardRequest,
  cardSubscription,
  subscriptionPayment,
  subscriptionPaymentItem,
  subscriptionPlan,
} from '~~/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { splitName } from '~~/server/services/card';
import { derivePlanCodeFromSource } from '~~/shared/utils/subscription';
import { notifySubscriptionSubmissionEmails } from '~~/server/utils/subscription-email-notifications';
import { env } from '~~/server/utils/env';

const NEW_DESIGN_PLAN_CODE = 'premium';

function fireCardRequestSubmittedEmails(
  session: { user: { email?: string | null; name?: string | null } },
  payload: {
    request: { id: string };
    paymentId: string;
    planCode: string;
    createdCardId: string;
  },
  kind: 'new_design' | 'existing_design'
) {
  const email = session.user.email?.trim();
  if (!email) return;

  const planLabel = payload.planCode.charAt(0).toUpperCase() + payload.planCode.slice(1);
  const submissionTitle =
    kind === 'new_design'
      ? 'New Card Design Request'
      : `Existing Design ${planLabel} Request`;
  const userBodyText =
    kind === 'new_design'
      ? 'Thank you for submitting your new card design request and payment receipt. We have received everything and will review it shortly.'
      : `Thank you for submitting your existing-design ${payload.planCode} request and payment receipt. We have received everything and will review it shortly.`;

  const thakhinRequestsUrl = new URL('/thakhin/requests', env.BASE_URL).href;

  void notifySubscriptionSubmissionEmails({
    payerEmail: email,
    payerName: session.user.name?.trim() || email,
    submissionTitle,
    userBodyText: `${userBodyText}\n\nRequest ID: ${payload.request.id}\nPayment ID: ${payload.paymentId}`,
    teamDetailLines: [
      `Request type: ${kind === 'new_design' ? 'New card design' : `Existing design → ${payload.planCode}`}`,
      `Plan: ${payload.planCode}`,
    ],
    teamRequestsDashboardUrl: thakhinRequestsUrl,
  }).catch((err) => console.error('[new-request] notify emails', err));
}

function addYears(base: Date, years: number) {
  const result = new Date(base);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });

  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  const body = await readValidatedBody(
    event,
    cardRequestInsertSchema.safeParse
  );

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: body.error.issues,
    });
  }

  try {
    if (!body.data.paymentReceiptUrl?.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Payment receipt is required.',
      });
    }

    const activeOrgId = session.session.activeOrganizationId;
    if (!activeOrgId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No active organization selected.',
      });
    }

    if (body.data.type !== 'existing_design') {
      const planRows = await db
        .select({
          code: subscriptionPlan.code,
          priceMinor: subscriptionPlan.priceMinor,
          currency: subscriptionPlan.currency,
        })
        .from(subscriptionPlan)
        .where(
          and(
            eq(subscriptionPlan.code, NEW_DESIGN_PLAN_CODE),
            eq(subscriptionPlan.isActive, true)
          )
        )
        .limit(1);
      const plan = planRows[0];

      if (!plan) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Unable to resolve an active subscription plan.',
        });
      }

      const now = new Date();
      const payload = await db.transaction(async (tx) => {
        const { name, position, company, phone, email, website, socials } =
          body.data.cardData || {};
        const { firstName, lastName } = splitName(name);

        const [createdCard] = await tx
          .insert(card)
          .values({
            firstName,
            lastName,
            slug: `${slugify(name || `${firstName} ${lastName}`)}-${nanoid(6)}`,
            position: position || '',
            company: company || null,
            phone: phone || null,
            email: email || null,
            website: website || null,
            socials: socials || [],
            organizationId: activeOrgId,
            userId: session.user.id,
          })
          .returning();

        const [request] = await tx
          .insert(cardRequest)
          .values({
            type: body.data.type,
            cardData: body.data.cardData,
            paymentReceiptUrl: body.data.paymentReceiptUrl,
            userId: session.user.id,
            status: 'pending',
          })
          .returning();

        const [payment] = await tx
          .insert(subscriptionPayment)
          .values({
            organizationId: activeOrgId,
            paidByUserId: session.user.id,
            requestId: request.id,
            receiptUrl: body.data.paymentReceiptUrl,
            status: 'submitted',
            note: `New design request (${request.id})`,
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
            status: 'pending_approval',
            isTrial: false,
            currentPeriodStartAt: paymentItem.startAt,
            currentPeriodEndAt: paymentItem.endAt,
            lastPaymentItemId: paymentItem.id,
            activatedAt: null,
            expiredAt: null,
          })
          .onConflictDoUpdate({
            target: cardSubscription.cardId,
            set: {
              planCode: plan.code,
              status: 'pending_approval',
              isTrial: false,
              currentPeriodStartAt: paymentItem.startAt,
              currentPeriodEndAt: paymentItem.endAt,
              lastPaymentItemId: paymentItem.id,
              activatedAt: null,
              expiredAt: null,
              updatedAt: now,
            },
          });

        return {
          request,
          createdCardId: createdCard.id,
          planCode: plan.code,
          paymentId: payment.id,
        };
      });

      fireCardRequestSubmittedEmails(session, payload, 'new_design');
      return payload;
    }

    const sourceCardId = body.data.cardData?.sourceCardId;
    if (!sourceCardId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Please choose an existing card design.',
      });
    }

    const sourceRows = await db
      .select({
        sourceCard: card,
        subscriptionPlanCode: cardSubscription.planCode,
        subscriptionStatus: cardSubscription.status,
        subscriptionIsTrial: cardSubscription.isTrial,
      })
      .from(card)
      .leftJoin(cardSubscription, eq(cardSubscription.cardId, card.id))
      .where(
        and(eq(card.id, sourceCardId), eq(card.organizationId, activeOrgId))
      )
      .limit(1);

    const sourceRow = sourceRows[0];
    if (!sourceRow) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Selected card design is invalid.',
      });
    }

    const sourceCard = sourceRow.sourceCard;
    const derivedPlanCode = derivePlanCodeFromSource({
      planCode: sourceRow.subscriptionPlanCode,
      status: sourceRow.subscriptionStatus,
      isTrial: sourceRow.subscriptionIsTrial,
    });
    const planRows = await db
      .select({
        code: subscriptionPlan.code,
        priceMinor: subscriptionPlan.priceMinor,
        currency: subscriptionPlan.currency,
      })
      .from(subscriptionPlan)
      .where(
        and(
          eq(subscriptionPlan.code, derivedPlanCode),
          eq(subscriptionPlan.isActive, true)
        )
      )
      .limit(1);
    const plan = planRows[0];

    if (!plan) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Unable to resolve an active subscription plan.',
      });
    }

    const now = new Date();

    const payload = await db.transaction(async (tx) => {
      const { name, position, company, phone, email, website, socials } =
        body.data.cardData || {};
      const { firstName, lastName } = splitName(name);

      const [createdCard] = await tx
        .insert(card)
        .values({
          firstName,
          lastName,
          slug: `${slugify(name || `${firstName} ${lastName}`)}-${nanoid(6)}`,
          position: position || 'Professional',
          company,
          phone,
          email,
          website,
          socials: socials || [],
          splineUrl: sourceCard.splineUrl,
          cardBackUrl: sourceCard.cardBackUrl,
          wallpaperUrl: sourceCard.wallpaperUrl,
          organizationId: activeOrgId,
          userId: session.user.id,
        })
        .returning();

      const [request] = await tx
        .insert(cardRequest)
        .values({
          type: body.data.type,
          cardData: body.data.cardData,
          paymentReceiptUrl: body.data.paymentReceiptUrl,
          userId: session.user.id,
          status: 'pending',
        })
        .returning();

      const [payment] = await tx
        .insert(subscriptionPayment)
        .values({
          organizationId: activeOrgId,
          paidByUserId: session.user.id,
          requestId: request.id,
          receiptUrl: body.data.paymentReceiptUrl,
          status: 'submitted',
          note: `Existing design request (${request.id})`,
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
          status: 'pending_approval',
          isTrial: false,
          currentPeriodStartAt: paymentItem.startAt,
          currentPeriodEndAt: paymentItem.endAt,
          lastPaymentItemId: paymentItem.id,
          activatedAt: null,
          expiredAt: null,
        })
        .onConflictDoUpdate({
          target: cardSubscription.cardId,
          set: {
            planCode: plan.code,
            status: 'pending_approval',
            isTrial: false,
            currentPeriodStartAt: paymentItem.startAt,
            currentPeriodEndAt: paymentItem.endAt,
            lastPaymentItemId: paymentItem.id,
            activatedAt: null,
            expiredAt: null,
            updatedAt: now,
          },
        });

      return {
        request,
        createdCardId: createdCard.id,
        planCode: plan.code,
        paymentId: payment.id,
      };
    });

    fireCardRequestSubmittedEmails(session, payload, 'existing_design');
    return payload;
  } catch (e) {
    console.error(e);
    if (isError(e)) throw e;
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
    });
  }
});
