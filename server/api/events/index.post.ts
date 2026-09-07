import { insertEvent, toEventDTO } from '~~/server/db/queries/event';
import { handleApiError } from '~~/server/utils/errors';
import { requireOrganizationSession } from '~~/server/utils/organization-permissions';
import { createEventBodySchema } from '~~/shared/types/event';
import { wallClockDate } from '~~/shared/utils/event-datetime';
import { mimicEventImageUrls } from '~~/shared/utils/event-media';

export default defineEventHandler(async (event) => {
  const session = await requireOrganizationSession(event);
  const body = await readValidatedBody(event, createEventBodySchema.safeParse);

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: body.error.issues,
    });
  }

  try {
    const { coverUrl, photoUrls } = mimicEventImageUrls(
      body.data.extraPhotoCount
    );

    const inserted = await insertEvent({
      organizationId: session.session.activeOrganizationId,
      userId: session.user.id,
      title: body.data.title,
      description: body.data.description?.trim() || null,
      location: body.data.location,
      startsAt: wallClockDate(body.data.date, body.data.startTime),
      endsAt: wallClockDate(body.data.date, body.data.endTime),
      capacity: body.data.capacity,
      coverUrl,
      photoUrls,
    });

    if (!inserted) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create event',
      });
    }

    return toEventDTO(inserted);
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to create event',
    });
  }
});
