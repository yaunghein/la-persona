import { listCardRequests } from '~~/server/features/card/card-request.service';
import { ListCardRequestsQuery } from '~~/shared/contracts/card';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'cardRequest:read');
  const query = await parseRequestQuery(event, ListCardRequestsQuery);
  return listCardRequests(query);
});
