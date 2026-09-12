import { findPublicEventById, toEventDTO } from '~~/server/db/queries/event';
import { handleApiError } from '~~/server/utils/errors';
import type { PublicEventDTO } from '~~/shared/types/event';

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, 'eventId');

  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Event id is required',
    });
  }

  try {
    const row = await findPublicEventById(eventId);

    if (!row) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Event not found',
      });
    }

    const payload: PublicEventDTO = {
      ...toEventDTO(row.event),
      organizer: {
        name: row.organizationName,
        logoUrl: row.organizationLogo,
        slug: row.organizationSlug,
      },
    };

    return payload;
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to load event',
    });
  }
});
