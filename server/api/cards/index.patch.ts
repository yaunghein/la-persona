import { updateCard } from '~~/server/services/card';
import {
  hasOrganizationPermission,
  requireOrganizationPermission,
} from '~~/server/utils/organization-permissions';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';
import { enrichLog } from '~~/server/utils/wide-event';

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
    const canUpdateAny = await hasOrganizationPermission(
      event,
      ORGANIZATION_PERMISSIONS.CARD_READ_ALL,
      organizationId
    );
    enrichLog(event, { card: { id: result.data.id } });
    const updated = await updateCard(
      session.user.id,
      organizationId,
      result.data,
      { scopeToUser: !canUpdateAny }
    );
    enrichLog(event, { card: { slug: updated.slug } });
    return updated;
  } catch (e) {
    handleApiError(e, {
      statusMessage: 'Failed to update card',
    });
  }
});
