import { getCommunityInsights } from '~~/server/db/queries/community-insights';
import { handleApiError } from '~~/server/utils/errors';
import { requestTimezoneOffset } from '~~/server/utils/request-timezone';
import {
  requireCommunityManager,
  requireCommunityOrganization,
} from '~~/server/utils/organization-permissions';
import { parseAnalyticsPeriod } from '~~/shared/utils/analytics-period';

export default defineEventHandler(async (event) => {
  const { org } = await requireCommunityOrganization(event);
  await requireCommunityManager(
    event,
    'Only community managers can view community insights'
  );

  try {
    const period = parseAnalyticsPeriod(getQuery(event).period);
    return await getCommunityInsights(
      org.id,
      period,
      requestTimezoneOffset(event)
    );
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to load community insights',
    });
  }
});
