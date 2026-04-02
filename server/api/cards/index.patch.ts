import { updateCard } from '~~/server/services/card';
import { requireOrganizationPermission } from '~~/server/utils/organization-permissions';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';

export default defineEventHandler(async (event) => {
  const session = await requireOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.CARD_UPDATE
  );
  const organizationId = session.session.activeOrganizationId;

  const result = await readValidatedBody(event, cardUpdateSchema.safeParse);

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Please review the card details and try again.',
      data: result.error.issues,
    });
  }

  try {
    return await updateCard(session.user.id, organizationId, result.data);
  } catch (e) {
    handleApiError(e, {
      statusMessage: 'Failed to update card',
    });
  }
});
