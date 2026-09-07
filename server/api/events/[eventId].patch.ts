import {
  findEventByIdAndOrganizationId,
  toEventDTO,
  updateEventByIdAndOrganizationId,
} from '~~/server/db/queries/event';
import { handleApiError } from '~~/server/utils/errors';
import { requireOrganizationSession } from '~~/server/utils/organization-permissions';
import { updateEventBodySchema } from '~~/shared/types/event';
import { wallClockDate } from '~~/shared/utils/event-datetime';
import { resolveUpdatedEventImageUrls } from '~~/shared/utils/event-media';

export default defineEventHandler(async (event) => {
  const session = await requireOrganizationSession(event);
  const eventId = getRouterParam(event, 'eventId');
  const body = await readValidatedBody(event, updateEventBodySchema.safeParse);

  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Event id is required',
    });
  }

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: body.error.issues,
    });
  }

  try {
    const existing = await findEventByIdAndOrganizationId(
      eventId,
      session.session.activeOrganizationId
    );

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Event not found',
      });
    }

    const { coverUrl, photoUrls } = resolveUpdatedEventImageUrls({
      existingCoverUrl: existing.coverUrl,
      coverChanged: body.data.coverChanged,
      keptPhotoUrls: body.data.keptPhotoUrls,
      newPhotoCount: body.data.newPhotoCount,
    });

    const updated = await updateEventByIdAndOrganizationId(
      eventId,
      session.session.activeOrganizationId,
      {
        title: body.data.title,
        description: body.data.description?.trim() || null,
        location: body.data.location,
        startsAt: wallClockDate(body.data.date, body.data.startTime),
        endsAt: wallClockDate(body.data.date, body.data.endTime),
        capacity: body.data.capacity,
        coverUrl,
        photoUrls,
      }
    );

    if (!updated) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update event',
      });
    }

    return toEventDTO(updated);
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to update event',
    });
  }
});
