import { listCardsForAdmin } from '~~/server/features/card/card-admin.service';
import { ListAdminCardsQuery } from '~~/shared/contracts/card';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'card:read');
  const query = await parseRequestQuery(event, ListAdminCardsQuery);
  return listCardsForAdmin(query);
});
