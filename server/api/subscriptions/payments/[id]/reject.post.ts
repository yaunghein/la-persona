import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { subscriptionPayment, user } from '~~/server/db/schema';
import { rejectSubscriptionPaymentBodySchema } from '~~/shared/types/subscription';
import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { notifySubscriptionPaymentRejectedEmail } from '~~/server/utils/subscription-email-notifications';
import { enrichLog, trackEmailSends } from '~~/server/utils/wide-event';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);

  const parsed = await readValidatedBody(
    event,
    rejectSubscriptionPaymentBodySchema.safeParse
  );
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: parsed.error.issues,
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
      where: eq(subscriptionPayment.id, paymentId),
    });

    if (!payment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Payment not found.',
      });
    }

    if (payment.status !== 'submitted') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Only submitted payments can be rejected.',
      });
    }

    const isLegacyLinkedByNote =
      /^((New|Existing) design request \([^)]+\))$/.test(payment.note || '');
    const isLinkedDesignRequest =
      Boolean(payment.requestId) || isLegacyLinkedByNote;
    if (isLinkedDesignRequest) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'This payment is linked to a card request. Reject it from the Requests flow if applicable.',
      });
    }

    const rejectionParts = [parsed.data.reason, parsed.data.note].filter(
      Boolean
    );
    const noteSuffix =
      rejectionParts.length > 0
        ? `\nRejected: ${rejectionParts.join(' — ')}`
        : '';
    const nextNote = [payment.note, noteSuffix].filter(Boolean).join('');

    const [updatedPayment] = await tx
      .update(subscriptionPayment)
      .set({
        status: 'rejected',
        note: nextNote || payment.note,
        updatedAt: now,
      })
      .where(eq(subscriptionPayment.id, payment.id))
      .returning();

    return { payment: updatedPayment };
  });

  const [payer] = await db
    .select({ email: user.email, name: user.name })
    .from(user)
    .where(eq(user.id, payload.payment.paidByUserId))
    .limit(1);

  const payerEmail = payer?.email?.trim() || '';
  enrichLog(event, {
    payment: {
      id: payload.payment.id,
      organization_id: payload.payment.organizationId,
      decision: 'rejected',
      ...(payerEmail ? { payer_email: payerEmail } : {}),
    },
  });
  if (payerEmail) {
    const reasonBlock =
      parsed.data.reason || parsed.data.note
        ? `\n\nDetails:\n${[parsed.data.reason, parsed.data.note].filter(Boolean).join('\n')}`
        : '';
    enrichLog(event, {
      email: {
        attempted: true,
        template: 'payment_rejected',
        to: [payerEmail],
      },
    });
    trackEmailSends(
      event,
      notifySubscriptionPaymentRejectedEmail({
        payerEmail,
        payerName: payer?.name?.trim() || payerEmail,
        bodyText: `We were not able to approve your subscription payment (reference: ${payload.payment.id}).${reasonBlock}\n\nIf you believe this is a mistake, please reply to this email or contact us through your usual LA PERSONA channel.`,
      })
    );
  }

  return payload;
});
