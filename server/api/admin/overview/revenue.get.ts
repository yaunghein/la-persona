import { getAdminRevenue } from '~~/server/features/admin/overview.repository';
import { AdminRevenueQuery } from '~~/shared/contracts/admin';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'insight:read');
  const { range } = await parseRequestQuery(event, AdminRevenueQuery);
  return getAdminRevenue(range);
});
