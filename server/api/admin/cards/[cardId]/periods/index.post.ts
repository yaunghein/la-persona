import { addCardPeriod } from '~~/server/features/billing/card-period.service';
import { AddCardPeriodRequest } from '~~/shared/contracts/billing';
import { AdminCardRouteParams } from '~~/shared/contracts/card';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'card:update');
  const { cardId } = await parseRouteParams(event, AdminCardRouteParams);
  const request = await parseRequestBody(event, AddCardPeriodRequest);
  const created = await addCardPeriod(cardId, request);
  enrichLog(event, {
    card: {
      id: cardId,
      period_id: created.id,
      payment_id: created.paymentId,
      kind: request.kind,
    },
  });
  return respondCreated(
    event,
    `/api/admin/cards/${cardId}/periods/${created.id}`,
    created
  );
});
