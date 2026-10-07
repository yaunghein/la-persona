import {
  findEventByIdAndOrganizationId,
  toEventDTO,
  updateEventByIdAndOrganizationId,
} from '~~/server/db/queries/event';
import { handleApiError } from '~~/server/utils/errors';
import { requireOrganizationPermission } from '~~/server/utils/organization-permissions';
import { updateEventBodySchema } from '~~/shared/types/event';
import { wallClockDate } from '~~/shared/utils/event-datetime';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';
import { changedFieldNames, enrichLog } from '~~/server/utils/wide-event';

export default defineEventHandler(async (event) => {
  const session = await requireOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.EVENT_UPDATE
  );
  const eventId = getRouterParam(event, 'eventId');
  const body = await readValidatedBody(event, updateEventBodySchema.safeParse);

  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Event id is required',
    });
  }
  enrichLog(event, {
    event: { id: eventId, fields: changedFieldNames(body.success ? body.data : {}) },
  });

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
        coverUrl: body.data.coverUrl,
        photoUrls: body.data.photoUrls,
        registrationMode: body.data.registrationMode,
        approvalMode: body.data.approvalMode,
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
