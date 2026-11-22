import { describeAdminOverview } from '~~/server/features/admin/overview.service';

export default defineEventHandler((event) => {
  authorizePlatformAccess(event, 'insight:read');
  return describeAdminOverview();
});
