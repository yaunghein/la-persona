import {
  findEventsByOrganizationId,
  toEventDTO,
} from '~~/server/db/queries/event';
import { handleApiError } from '~~/server/utils/errors';
import { requireOrganizationSession } from '~~/server/utils/organization-permissions';

export default defineEventHandler(async (event) => {
  const session = await requireOrganizationSession(event);

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
