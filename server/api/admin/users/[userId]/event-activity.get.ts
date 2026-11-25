import { listPersonEventActivity } from '~~/server/features/admin/user-activity.repository';
import { AdminUserRouteParams } from '~~/shared/contracts/account';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'insight:read');
  const { userId } = await parseRouteParams(event, AdminUserRouteParams);
  return { items: await listPersonEventActivity(userId) };
});
