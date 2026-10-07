import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { enrichLog } from '~~/server/utils/wide-event';
import { cancelOnboardingInvitation } from '~~/server/services/onboarding-invitation';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const invitationId = getRouterParam(event, 'id');
  if (!invitationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invitation id is required',
    });
  }

  const result = await cancelOnboardingInvitation(invitationId);
  enrichLog(event, {
    invitation: {
      id: result.id,
      email: result.email,
      card_id: result.cardId,
      deleted_organization_id: result.deletedOrganizationId,
    },
  });
  return result;
});
