import { findOrganizationById } from '~~/server/features/organization/community.repository';
import { listCompanyCards } from '~~/server/features/organization/company.service';
import { AdminOrganizationRouteParams } from '~~/shared/contracts/organization';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'card:read');
  const { organizationId } = await parseRouteParams(
    event,
    AdminOrganizationRouteParams
  );
  const organization = await findOrganizationById(organizationId);
  if (!organization || organization.type !== ORGANIZATION_TYPES.COMPANY) {
    throw notFound('Company');
  }
  return listCompanyCards(organizationId);
});
