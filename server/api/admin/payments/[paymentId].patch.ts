import { reviewPayment } from '~~/server/features/billing/billing.service';
import {
  PaymentRouteParams,
  ReviewPaymentRequest,
} from '~~/shared/contracts/billing';

/** Approve or reject a submitted renewal / upgrade payment. */
export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'payment:review');
  const { paymentId } = await parseRouteParams(event, PaymentRouteParams);
  const decision = await parseRequestBody(event, ReviewPaymentRequest);

  const result = await reviewPayment(paymentId, decision);
  enrichLog(event, {
    payment: {
      id: result.payment.id,
      organization_id: result.payment.organizationId,
      decision: decision.status,
      item_count: result.itemCount,
      ...(result.payerEmail ? { payer_email: result.payerEmail } : {}),
    },
  });
  if (result.emails) {
    enrichLog(event, {
      email: {
        attempted: true,
        template: `payment_${decision.status}`,
        to: [result.payerEmail],
      },
    });
    trackEmailSends(event, result.emails);
  }

  return { id: result.payment.id, status: result.payment.status };
});
