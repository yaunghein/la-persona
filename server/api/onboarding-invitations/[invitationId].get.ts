import { previewInvitationForUser } from '~~/server/features/onboarding/onboarding-invitation.service';
import { OnboardingInvitationRouteParams } from '~~/shared/contracts/onboarding';

export default defineEventHandler(async (event) => {
  const principal = requirePrincipal(event);
  const { invitationId } = await parseRouteParams(event, OnboardingInvitationRouteParams);
  return previewInvitationForUser(invitationId, principal.user.email);
});
