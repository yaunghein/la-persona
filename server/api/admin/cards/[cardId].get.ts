import { describeCardForAdmin } from '~~/server/features/card/card-admin.service';
import { AdminCardRouteParams } from '~~/shared/contracts/card';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'card:read');
  const { cardId } = await parseRouteParams(event, AdminCardRouteParams);
  return describeCardForAdmin(cardId);
});
