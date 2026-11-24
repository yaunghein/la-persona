import { authorizeCommunityAccess } from '~~/server/features/organization/organization.policy';
import { removeMember } from '~~/server/features/organization/community.service';
import { OrganizationRouteParams } from '~~/shared/contracts/organization';

/** The caller leaves a community. The last organizer can't; companies offboard through their admins. */
export default defineEventHandler(async (event) => {
  const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
  const { organization, membership, principal } =
    await authorizeCommunityAccess(event, orgSlug);
  enrichLog(event, {
    member: { id: membership.id, role: membership.role, result: 'left' },
  });
  await removeMember({
    memberId: membership.id,
    organizationId: organization.id,
    actorRole: membership.role,
    actorUserId: principal.user.id,
  });
  return respondNoContent(event);
});
