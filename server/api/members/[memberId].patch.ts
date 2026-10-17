import { auth } from '~~/server/auth';
import { authorizeMemberAccess } from '~~/server/features/organization/organization.policy';
import { assertMemberRoleChangeable } from '~~/server/features/organization/community.service';
import {
  MemberRouteParams,
  UpdateMemberRequest,
} from '~~/shared/contracts/organization';

export default defineEventHandler(async (event) => {
  const { memberId } = await parseRouteParams(event, MemberRouteParams);
  const { organization } = await authorizeMemberAccess(
    event,
    memberId,
    'member:update'
  );
  const { role } = await parseRequestBody(event, UpdateMemberRequest);

  const target = await assertMemberRoleChangeable(memberId, organization.id);
  await auth.api.updateMemberRole({
    body: { memberId, role, organizationId: organization.id },
    headers: event.headers,
  });
  enrichLog(event, { member: { previous_role: target.role, new_role: role } });
  return { id: memberId, role };
});
