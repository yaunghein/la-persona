import { reviewCardRequest } from '~~/server/features/card/card-request.service';
import {
  CardRequestRouteParams,
  ReviewCardRequestRequest,
} from '~~/shared/contracts/card';

/** Approve (activates the card's paid term) or decline (rejects the payment). */
export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'cardRequest:review');
  const { cardRequestId } = await parseRouteParams(event, CardRequestRouteParams);
  const { status } = await parseRequestBody(event, ReviewCardRequestRequest);
  enrichLog(event, { card_request: { id: cardRequestId } });

  const result = await reviewCardRequest(cardRequestId, status);
  enrichLog(event, {
    card_request: {
      decision: status,
      payment_ids: result.paymentIds,
      ...(result.requesterEmail ? { requester_email: result.requesterEmail } : {}),
    },
  });
  return { id: result.requestId, status: result.status };
});
