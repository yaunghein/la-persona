import { updateCardPeriodItem } from '~~/server/features/billing/card-period.service';
import {
  PaymentItemRouteParams,
  UpdatePaymentItemRequest,
} from '~~/shared/contracts/billing';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'payment:review');
  const { itemId } = await parseRouteParams(event, PaymentItemRouteParams);
  const request = await parseRequestBody(event, UpdatePaymentItemRequest);
  const updated = await updateCardPeriodItem(itemId, request);
  enrichLog(event, {
    payment_item: {
      id: itemId,
      amount_minor: updated.amountMinor,
    },
  });
  return {
    id: updated.id,
    amountMinor: updated.amountMinor,
    startAt: updated.startAt.toISOString(),
    endAt: updated.endAt.toISOString(),
  };
});
