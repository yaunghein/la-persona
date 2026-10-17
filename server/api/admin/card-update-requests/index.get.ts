import { listCardUpdateRequests } from '~~/server/features/card/card-update-request.service';
import { ListCardUpdateRequestsQuery } from '~~/shared/contracts/card';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'cardRequest:read');
  const query = await parseRequestQuery(event, ListCardUpdateRequestsQuery);
  return listCardUpdateRequests(query);
});
