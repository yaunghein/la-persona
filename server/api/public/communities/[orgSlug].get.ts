import { describePublicCommunity } from '~~/server/features/organization/community.service';
import { OrganizationRouteParams } from '~~/shared/contracts/organization';

/** Public community page: the About content anyone can read. */
export default defineEventHandler(async (event) => {
  const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
  return describePublicCommunity(orgSlug);
});
