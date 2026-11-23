import { z } from 'zod';
import { companyInsights } from '~~/server/features/organization/company.service';
import { AnalyticsQuery } from '~~/shared/contracts/analytics';
import { OrganizationRouteParams } from '~~/shared/contracts/organization';
import {
  analyticsPeriodDays,
  analyticsPeriodStart,
} from '~~/shared/utils/analytics-period';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export default defineEventHandler(async (event) => {
  const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
  const access = await authorizeOrganizationAccess(
    event,
    orgSlug,
    'insight:read'
  );
  if (access.organization.type !== ORGANIZATION_TYPES.COMPANY) {
    throw notFound('Company');
  }
  const query = await parseRequestQuery(
    event,
    AnalyticsQuery.extend({
      departmentId: z.string().trim().min(1).optional(),
    })
  );
  return companyInsights(
    access.organization.id,
    analyticsPeriodStart(query.period),
    query.departmentId,
    { days: analyticsPeriodDays(query.period), timezoneOffset: query.tzOffset }
  );
});
