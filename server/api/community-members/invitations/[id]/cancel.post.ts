import { auth } from '~~/server/auth';
import { handleApiError } from '~~/server/utils/errors';
import { requireCommunityOrganization } from '~~/server/utils/organization-permissions';
import { requireOrganizationPermission } from '~~/server/utils/organization-permissions';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';

export default defineEventHandler(async (event) => {
  await requireCommunityOrganization(event);
  await requireOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.INVITATION_CANCEL
  );

  const invitationId = getRouterParam(event, 'id');
  if (!invitationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invitation id is required',
    });
  }

  try {
    await auth.api.cancelInvitation({
      body: { invitationId },
      headers: event.headers,
    });

    return { success: true };
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to cancel invitation',
    });
  }
});
