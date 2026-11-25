import { listEventOptions } from '~~/server/features/admin/user-activity.repository';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'insight:read');
  return { items: await listEventOptions() };
});
