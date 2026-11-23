import { deleteDepartment } from '~~/server/features/organization/company.service';
import { z } from 'zod';

const Params = z.object({
  orgSlug: z.string().trim().min(1),
  departmentId: z.string().trim().min(1),
});

export default defineEventHandler(async (event) => {
  const { orgSlug, departmentId } = await parseRouteParams(event, Params);
  await authorizeOrganizationAccess(event, orgSlug, 'department:delete');
  await deleteDepartment(departmentId);
  return respondNoContent(event);
});
