import { reviewCardUpdateRequest } from '~~/server/features/card/card-update-request.service';
import {
  CardUpdateRequestRouteParams,
  ReviewCardRequestRequest,
} from '~~/shared/contracts/card';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'cardRequest:review');
  const { cardUpdateRequestId } = await parseRouteParams(
    event,
    CardUpdateRequestRouteParams
  );
  const { status } = await parseRequestBody(event, ReviewCardRequestRequest);

  const result = await reviewCardUpdateRequest(cardUpdateRequestId, status);
  enrichLog(event, {
    card_update_request: {
      id: cardUpdateRequestId,
      card_id: result.cardId,
      decision: status,
      fields: result.fields,
      requester_email: result.requesterEmail,
    },
  });
  return { id: cardUpdateRequestId, status, fields: result.fields };
});
