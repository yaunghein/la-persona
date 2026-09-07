import {
  findEventsByOrganizationId,
  toEventDTO,
} from '~~/server/db/queries/event';
import { handleApiError } from '~~/server/utils/errors';
import { requireOrganizationPermission } from '~~/server/utils/organization-permissions';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';

export default defineEventHandler(async (event) => {
  const session = await requireOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.EVENT_READ
  );

  try {
    const rows = await findEventsByOrganizationId(
      session.session.activeOrganizationId
    );

    return {
      events: rows.map(toEventDTO),
    };
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to load events',
    });
  }
});
