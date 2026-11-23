import { listDepartments } from '~~/server/features/organization/company.service';
import { OrganizationRouteParams } from '~~/shared/contracts/organization';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export default defineEventHandler(async (event) => {
  const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
  const access = await authorizeOrganizationAccess(
    event,
    orgSlug,
    'department:read'
  );
  if (access.organization.type !== ORGANIZATION_TYPES.COMPANY) {
    throw notFound('Company');
  }
  return listDepartments(access.organization.id);
});
