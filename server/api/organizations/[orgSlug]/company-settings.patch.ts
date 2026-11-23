import {
  describeCompanySettings,
  updateCompanySettings,
} from '~~/server/features/organization/company.service';
import { UpdateCompanySettingsRequest } from '~~/shared/contracts/company';
import { OrganizationRouteParams } from '~~/shared/contracts/organization';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export default defineEventHandler(async (event) => {
  const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
  const access = await authorizeOrganizationAccess(
    event,
    orgSlug,
    'organization:update'
  );
  if (access.organization.type !== ORGANIZATION_TYPES.COMPANY) {
    throw notFound('Company');
  }
  const body = await parseRequestBody(event, UpdateCompanySettingsRequest);
  await updateCompanySettings(access.organization.id, body);
  return describeCompanySettings(access.organization.id);
});
