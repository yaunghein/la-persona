import { deleteDepartment } from '~~/server/features/organization/company.service';
import { DepartmentRouteParams } from '~~/shared/contracts/company';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export default defineEventHandler(async (event) => {
  const { orgSlug, departmentId } = await parseRouteParams(
    event,
    DepartmentRouteParams
  );
  const access = await authorizeOrganizationAccess(
    event,
    orgSlug,
    'department:delete'
  );
  if (access.organization.type !== ORGANIZATION_TYPES.COMPANY) {
    throw notFound('Company');
  }
  enrichLog(event, { department: { id: departmentId } });
  await deleteDepartment(access.organization.id, departmentId);
  return respondNoContent(event);
});
