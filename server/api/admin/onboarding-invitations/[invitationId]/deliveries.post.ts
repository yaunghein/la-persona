import { deliverOnboardingInvitation } from '~~/server/features/onboarding/onboarding-invitation.service';
import { OnboardingInvitationRouteParams } from '~~/shared/contracts/onboarding';

/** (Re)sends the invitation email and restarts its expiry window. */
export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'onboardingInvitation:send');
  const { invitationId } = await parseRouteParams(
    event,
    OnboardingInvitationRouteParams
  );
  const invitation = await deliverOnboardingInvitation(invitationId);
  enrichLog(event, {
    invitation: {
      id: invitation.id,
      organization_id: invitation.organizationId,
      email: invitation.email,
    },
    email: {
      attempted: true,
      ok: true,
      template: 'onboarding_invitation',
      to: [invitation.email],
    },
  });
  return respondCreated(
    event,
    `/api/admin/onboarding-invitations/${invitationId}`,
    invitation
  );
});
