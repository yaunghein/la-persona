import { summarizeOrganizationAnalytics } from '~~/server/features/analytics/card-analytics.service';
import { AnalyticsQuery } from '~~/shared/contracts/analytics';
import { OrganizationRouteParams } from '~~/shared/contracts/organization';
import { isOrganizationManagerRole } from '~~/shared/permissions/organization';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export default defineEventHandler(async (event) => {
  const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
  const access = await authorizeOrganizationAccess(event, orgSlug, 'card:read');
  const query = await parseRequestQuery(event, AnalyticsQuery);

  return summarizeOrganizationAnalytics({
    organizationId: access.organization.id,
    viewerUserId: access.principal.user.id,
    // Community managers use community insights, not every member's card analytics.
    viewerSeesAllCards:
      isOrganizationManagerRole(access.membership.role) &&
      access.organization.type !== ORGANIZATION_TYPES.COMMUNITY,
    query,
  });
});
