import { authorizeMemberAccess } from '~~/server/features/organization/organization.policy';
import { removeMember } from '~~/server/features/organization/community.service';
import { MemberRouteParams } from '~~/shared/contracts/organization';

/** Removes the member, their community card and their registrations. */
export default defineEventHandler(async (event) => {
  const { memberId } = await parseRouteParams(event, MemberRouteParams);
  const { organization, membership } = await authorizeMemberAccess(
    event,
    memberId,
    'member:delete'
  );
  await removeMember({
    memberId,
    organizationId: organization.id,
    actorRole: membership.role,
  });
  return respondNoContent(event);
});
