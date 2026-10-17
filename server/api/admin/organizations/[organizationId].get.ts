import { describeOrganization } from '~~/server/features/organization/organization-admin.service';
import { AdminOrganizationRouteParams } from '~~/shared/contracts/organization';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'organization:read');
  const { organizationId } = await parseRouteParams(event, AdminOrganizationRouteParams);
  return describeOrganization(organizationId);
});
