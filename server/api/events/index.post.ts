import { insertEvent, toEventDTO } from '~~/server/db/queries/event';
import { handleApiError } from '~~/server/utils/errors';
import {
  enrichOrganizationName,
  requireOrganizationPermission,
} from '~~/server/utils/organization-permissions';
import { createEventBodySchema } from '~~/shared/types/event';
import { wallClockDate } from '~~/shared/utils/event-datetime';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';
import { enrichLog } from '~~/server/utils/wide-event';

export default defineEventHandler(async (event) => {
  const session = await requireOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.EVENT_CREATE
  );
  const body = await readValidatedBody(event, createEventBodySchema.safeParse);

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: body.error.issues,
    });
  }

  try {
    const inserted = await insertEvent({
      organizationId: session.session.activeOrganizationId,
      userId: session.user.id,
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
    });

    if (!inserted) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create event',
      });
    }

    enrichLog(event, { event: { id: inserted.id, title: inserted.title } });
    await enrichOrganizationName(event, inserted.organizationId);
    return toEventDTO(inserted);
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to create event',
    });
  }
});
