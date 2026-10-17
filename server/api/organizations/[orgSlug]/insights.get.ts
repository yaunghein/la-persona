import { getCommunityInsights } from '~~/server/features/analytics/community-insights.repository';
import { authorizeCommunityAccess } from '~~/server/features/organization/organization.policy';
import { AnalyticsQuery } from '~~/shared/contracts/analytics';
import { OrganizationRouteParams } from '~~/shared/contracts/organization';

/** Community growth and event performance, for community managers. */
export default defineEventHandler(async (event) => {
  const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
  const { organization } = await authorizeCommunityAccess(event, orgSlug, 'insight:read');
  const query = await parseRequestQuery(event, AnalyticsQuery);
  return getCommunityInsights(organization.id, query.period, query.tzOffset);
});
