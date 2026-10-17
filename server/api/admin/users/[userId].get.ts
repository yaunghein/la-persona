import { describeAccount } from '~~/server/features/auth/user-admin.service';
import { AdminUserRouteParams } from '~~/shared/contracts/account';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'user:list');
  const { userId } = await parseRouteParams(event, AdminUserRouteParams);
  return describeAccount(userId);
});
