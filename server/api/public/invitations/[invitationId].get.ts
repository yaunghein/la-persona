import { describeInvitationInvitee } from '~~/server/features/organization/invitation.service';
import { InvitationRouteParams } from '~~/shared/contracts/organization';

/** Lets sign-in prefill the invited address before the invitee has a session. */
export default defineEventHandler(async (event) => {
  const { invitationId } = await parseRouteParams(event, InvitationRouteParams);
  return describeInvitationInvitee(event, invitationId);
});
