import { authorizeCommunityAccess } from '~~/server/features/organization/organization.policy';
import { issueNewJoinLink } from '~~/server/features/organization/community.service';
import { OrganizationRouteParams } from '~~/shared/contracts/organization';

/** Issues a fresh join link; the previous link stops working. */
export default defineEventHandler(async (event) => {
  const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
  const { organization } = await authorizeCommunityAccess(
    event,
    orgSlug,
    'invitation:create'
  );
  const joinLink = await issueNewJoinLink(organization.id);
  enrichLog(event, {
    join_link: { rotated: true },
  });
  return respondCreated(
    event,
    `/api/organizations/${orgSlug}/join-link`,
    joinLink
  );
});
