import {
  deleteDepartment,
  renameDepartment,
} from '~~/server/features/organization/company.service';
import { DepartmentNameRequest } from '~~/shared/contracts/company';
import { z } from 'zod';

const Params = z.object({
  orgSlug: z.string().trim().min(1),
  departmentId: z.string().trim().min(1),
});

export default defineEventHandler(async (event) => {
  const { orgSlug, departmentId } = await parseRouteParams(event, Params);
  await authorizeOrganizationAccess(event, orgSlug, 'department:update');
  const body = await parseRequestBody(event, DepartmentNameRequest);
  return renameDepartment(departmentId, body.name);
});
