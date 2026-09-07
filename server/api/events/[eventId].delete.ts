import { deleteEventByIdAndOrganizationId } from '~~/server/db/queries/event';
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
    const deleted = await deleteEventByIdAndOrganizationId(
      eventId,
      session.session.activeOrganizationId
    );

    if (!deleted) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Event not found',
      });
    }

    return { id: deleted.id };
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to delete event',
    });
  }
});
