import { env } from '~~/env';
import { submitCardPayment } from '~~/server/features/billing/billing.service';
import { authorizeCardAccess } from '~~/server/features/card/card.policy';
import {
  CreateCardPaymentRequest,
  type CardPaymentReceipt,
} from '~~/shared/contracts/billing';
import { CardRouteParams } from '~~/shared/contracts/card';

export default defineEventHandler(async (event) => {
  const { cardSlug } = await parseRouteParams(event, CardRouteParams);
  const { card, principal } = await authorizeCardAccess(event, cardSlug, 'card:read');
  const request = await parseRequestBody(event, CreateCardPaymentRequest);

  const payment = await submitCardPayment({
    target: card,
    kind: request.kind,
    receiptUrl: request.receiptUrl,
    payer: {
      userId: principal.user.id,
      email: principal.user.email,
      name: principal.user.name,
    },
  });

  enrichLog(event, {
    payment: {
      id: payment.paymentId,
      decision: 'submitted',
      kind: request.kind,
      plan_code: payment.quote.planCode,
      payer_email: principal.user.email,
      ...(payment.cardRequestId ? { request_id: payment.cardRequestId } : {}),
    },
    email: { attempted: true, to: [principal.user.email, ...env.ADMIN_EMAILS] },
  });
  trackEmailSends(event, payment.emails);

  return respondCreated<CardPaymentReceipt>(
    event,
    `/api/admin/payments/${payment.paymentId}`,
    {
      paymentId: payment.paymentId,
      status: 'submitted',
      cardRequestId: payment.cardRequestId,
    }
  );
});
