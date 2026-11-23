import { createDepartment } from '~~/server/features/organization/company.service';
import { DepartmentNameRequest } from '~~/shared/contracts/company';
import { OrganizationRouteParams } from '~~/shared/contracts/organization';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export default defineEventHandler(async (event) => {
  const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
  const access = await authorizeOrganizationAccess(
    event,
    orgSlug,
    'department:create'
  );
  if (access.organization.type !== ORGANIZATION_TYPES.COMPANY) {
    throw notFound('Company');
  }
  const body = await parseRequestBody(event, DepartmentNameRequest);
  const created = await createDepartment(access.organization.id, body.name);
  enrichLog(event, { department: { id: created.id } });
  return respondCreated(
    event,
    `/api/organizations/${orgSlug}/departments/${created.id}`,
    created
  );
});
