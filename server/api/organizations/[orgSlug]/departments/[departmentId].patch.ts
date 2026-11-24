import { renameDepartment } from '~~/server/features/organization/company.service';
import {
  DepartmentNameRequest,
  DepartmentRouteParams,
} from '~~/shared/contracts/company';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export default defineEventHandler(async (event) => {
  const { orgSlug, departmentId } = await parseRouteParams(
    event,
    DepartmentRouteParams
  );
  const access = await authorizeOrganizationAccess(
    event,
    orgSlug,
    'department:update'
  );
  if (access.organization.type !== ORGANIZATION_TYPES.COMPANY) {
    throw notFound('Company');
  }
  enrichLog(event, { department: { id: departmentId } });
  const body = await parseRequestBody(event, DepartmentNameRequest);
  return renameDepartment(access.organization.id, departmentId, body.name);
});
