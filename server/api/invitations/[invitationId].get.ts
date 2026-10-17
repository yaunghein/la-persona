import { previewInvitation } from '~~/server/features/organization/invitation.service';
import { InvitationRouteParams } from '~~/shared/contracts/organization';

export default defineEventHandler(async (event) => {
  const { invitationId } = await parseRouteParams(event, InvitationRouteParams);
  const principal = requirePrincipal(event);
  return previewInvitation(event, invitationId, {
    userId: principal.user.id,
    email: principal.user.email,
  });
});
