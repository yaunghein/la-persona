import {
  createOnboardingInvitation,
  deliverOnboardingInvitation,
  describeInvitationForAdmin,
} from '~~/server/features/onboarding/onboarding-invitation.service';
import { CreateOnboardingInvitationRequest } from '~~/shared/contracts/onboarding';

export default defineEventHandler(async (event) => {
  const principal = authorizePlatformAccess(
    event,
    'onboardingInvitation:create'
  );
  const { sendNow, ...request } = await parseRequestBody(
    event,
    CreateOnboardingInvitationRequest
  );

  const created = await createOnboardingInvitation({
    ...request,
    createdByUserId: principal.user.id,
  });
  enrichLog(event, {
    invitation: {
      id: created.id,
      email: created.email,
      card_id: request.cardId,
      plan_code: request.subscriptionPlanCode,
    },
    ...(sendNow
      ? {
          email: {
            attempted: true,
            template: 'onboarding_invitation',
            to: [created.email],
          },
        }
      : {}),
  });

  const invitation = sendNow
    ? await deliverOnboardingInvitation(created.id)
    : await describeInvitationForAdmin(created.id);
  return respondCreated(
    event,
    `/api/admin/onboarding-invitations/${created.id}`,
    invitation
  );
});
