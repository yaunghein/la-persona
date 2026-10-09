import {
  findEventByIdAndOrganizationId,
  toEventDTO,
} from '~~/server/db/queries/event';
import {
  buildEventOverview,
  countCountedRegistrations,
  findRegistrationByEventAndUser,
  toViewerStatus,
} from '~~/server/db/queries/event-registration';
import { handleApiError } from '~~/server/utils/errors';
import { requestTimezoneOffset } from '~~/server/utils/request-timezone';
import { requireOrganizationPermission } from '~~/server/utils/organization-permissions';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';
import type { EventDetailDTO } from '~~/shared/types/event';

export default defineEventHandler(async (event) => {
  const session = await requireOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.EVENT_READ
  );
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

    const [registeredCount, viewer, overview] = await Promise.all([
      countCountedRegistrations(eventId),
      findRegistrationByEventAndUser(eventId, session.user.id),
      buildEventOverview(
        eventId,
        session.session.activeOrganizationId,
        row.createdAt,
        requestTimezoneOffset(event)
      ),
    ]);

    const payload: EventDetailDTO = {
      ...toEventDTO(row),
      registeredCount,
      viewerRegistrationStatus: toViewerStatus(viewer?.status),
      overview,
    };

    return payload;
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to load event',
    });
  }
});
