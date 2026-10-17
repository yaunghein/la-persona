import { authorizeCommunityAccess } from '~~/server/features/organization/organization.policy';
import { listCommunityRoster } from '~~/server/features/organization/community.service';
import { OrganizationRouteParams } from '~~/shared/contracts/organization';

/** Active members plus pending email invitations. */
export default defineEventHandler(async (event) => {
  const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
  const { organization } = await authorizeCommunityAccess(
    event,
    orgSlug,
    'member:create'
  );
  return listCommunityRoster(organization.id);
});
