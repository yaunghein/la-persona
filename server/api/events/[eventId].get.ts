import {
  findEventByIdAndOrganizationId,
  toEventDTO,
} from '~~/server/db/queries/event';
import { handleApiError } from '~~/server/utils/errors';
import { requireOrganizationSession } from '~~/server/utils/organization-permissions';

export default defineEventHandler(async (event) => {
  const session = await requireOrganizationSession(event);
  const eventId = getRouterParam(event, 'eventId');

  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Event id is required',
    });
  }

  try {
    const row = await findEventByIdAndOrganizationId(
      eventId,
      session.session.activeOrganizationId
    );

    if (!row) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Event not found',
      });
    }

    return toEventDTO(row);
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to load event',
    });
  }
});
