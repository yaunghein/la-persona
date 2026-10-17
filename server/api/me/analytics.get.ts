import { summarizeWorkspaceAnalytics } from '~~/server/features/analytics/card-analytics.service';
import { AnalyticsQuery } from '~~/shared/contracts/analytics';

export default defineEventHandler(async (event) => {
  const principal = requirePrincipal(event);
  const query = await parseRequestQuery(event, AnalyticsQuery);
  return summarizeWorkspaceAnalytics(principal.user.id, query);
});
