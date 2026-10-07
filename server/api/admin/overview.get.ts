import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { getAdminOverview } from '~~/server/services/admin-overview';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  return getAdminOverview();
});
