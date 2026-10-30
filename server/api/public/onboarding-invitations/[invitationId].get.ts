import { describeOnboardingInvitee } from '~~/server/features/onboarding/onboarding-invitation.service';
import { OnboardingInvitationRouteParams } from '~~/shared/contracts/onboarding';

/** Lets sign-in prefill the invited address before the invitee has a session. */
export default defineEventHandler(async (event) => {
  const { invitationId } = await parseRouteParams(
    event,
    OnboardingInvitationRouteParams
  );
  enrichLog(event, { invitation: { id: invitationId } });
  return describeOnboardingInvitee(invitationId);
});
