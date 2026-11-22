import { listUserPeriods } from '~~/server/features/billing/card-period.service';
import { AdminUserRouteParams } from '~~/shared/contracts/account';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'card:read');
  const { userId } = await parseRouteParams(event, AdminUserRouteParams);
  enrichLog(event, { user: { id: userId } });
  return listUserPeriods(userId);
});
