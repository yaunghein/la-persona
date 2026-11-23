import { listCompanyCards } from '~~/server/features/organization/company.service';
import { OrganizationRouteParams } from '~~/shared/contracts/organization';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export default defineEventHandler(async (event) => {
  const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
  const access = await authorizeOrganizationAccess(event, orgSlug, 'card:readAll');
  if (access.organization.type !== ORGANIZATION_TYPES.COMPANY) {
    throw notFound('Company');
  }
  return listCompanyCards(access.organization.id);
});
