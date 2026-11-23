import { recordCompanyPayment } from '~~/server/features/organization/company.service';
import { RecordCompanyPaymentRequest } from '~~/shared/contracts/company';
import { AdminOrganizationRouteParams } from '~~/shared/contracts/organization';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'card:update');
  const { organizationId } = await parseRouteParams(
    event,
    AdminOrganizationRouteParams
  );
  const request = await parseRequestBody(event, RecordCompanyPaymentRequest);
  const payment = await recordCompanyPayment({ organizationId, request });
  enrichLog(event, {
    organization_id: organizationId,
    payment: {
      id: payment.paymentId,
      card_ids: payment.cardIds,
      amount_minor: payment.amountMinor,
    },
  });
  return respondCreated(
    event,
    `/api/admin/payments/${payment.paymentId}`,
    payment
  );
});
