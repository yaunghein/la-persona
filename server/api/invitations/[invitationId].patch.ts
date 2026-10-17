import { reviewInvitation } from '~~/server/features/organization/invitation.service';
import {
  InvitationRouteParams,
  ReviewInvitationRequest,
} from '~~/shared/contracts/organization';

export default defineEventHandler(async (event) => {
  const { invitationId } = await parseRouteParams(event, InvitationRouteParams);
  const { status } = await parseRequestBody(event, ReviewInvitationRequest);
  const principal = requirePrincipal(event);

  const result = await reviewInvitation(event, invitationId, status, {
    userId: principal.user.id,
    email: principal.user.email,
  });
  enrichLog(event, { invitation: { result: result.status } });
  return result;
});
