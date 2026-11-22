import { getAdminCharts } from '~~/server/features/admin/overview.repository';
import { AdminChartsQuery } from '~~/shared/contracts/admin';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'insight:read');
  const { range } = await parseRequestQuery(event, AdminChartsQuery);
  return getAdminCharts(range);
});
