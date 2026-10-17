import { acceptOnboardingInvitation } from '~~/server/features/onboarding/onboarding-invitation.service';
import {
  AcceptOnboardingInvitationRequest,
  OnboardingInvitationRouteParams,
} from '~~/shared/contracts/onboarding';

/** The invitee claims their card. */
export default defineEventHandler(async (event) => {
  const principal = requirePrincipal(event);
  const { invitationId } = await parseRouteParams(event, OnboardingInvitationRouteParams);
  await parseRequestBody(event, AcceptOnboardingInvitationRequest);
  enrichLog(event, { invitation: { id: invitationId, email: principal.user.email } });

  return acceptOnboardingInvitation({
    invitationId,
    userId: principal.user.id,
    userEmail: principal.user.email,
    sessionId: principal.session.id,
  });
});
