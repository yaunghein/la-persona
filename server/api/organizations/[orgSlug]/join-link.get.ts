import { authorizeCommunityAccess } from '~~/server/features/organization/organization.policy';
import { describeJoinLink } from '~~/server/features/organization/community.service';
import { OrganizationRouteParams } from '~~/shared/contracts/organization';

export default defineEventHandler(async (event) => {
  const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
  const { organization } = await authorizeCommunityAccess(
    event,
    orgSlug,
    'invitation:create'
  );
  return describeJoinLink(organization.id);
});
