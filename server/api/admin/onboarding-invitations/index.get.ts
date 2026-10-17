import { listInvitationsForAdmin } from '~~/server/features/onboarding/onboarding-invitation.service';

export default defineEventHandler((event) => {
  authorizePlatformAccess(event, 'onboardingInvitation:read');
  return listInvitationsForAdmin();
});
