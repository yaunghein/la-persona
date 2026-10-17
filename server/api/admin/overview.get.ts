import { getAdminOverview } from '~~/server/features/admin/overview.repository';

export default defineEventHandler((event) => {
  authorizePlatformAccess(event, 'insight:read');
  return getAdminOverview();
});
