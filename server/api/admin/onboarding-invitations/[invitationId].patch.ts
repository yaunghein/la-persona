import { cancelOnboardingInvitation } from '~~/server/features/onboarding/onboarding-invitation.service';
import {
  CancelOnboardingInvitationRequest,
  OnboardingInvitationRouteParams,
} from '~~/shared/contracts/onboarding';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'onboardingInvitation:cancel');
  const { invitationId } = await parseRouteParams(event, OnboardingInvitationRouteParams);
  await parseRequestBody(event, CancelOnboardingInvitationRequest);

  const result = await cancelOnboardingInvitation(invitationId);
  enrichLog(event, {
    invitation: { id: result.id, email: result.email, card_id: result.cardId, deleted_organization_id: result.deletedOrganizationId },
  });
  return { id: result.id, status: 'canceled' };
});
