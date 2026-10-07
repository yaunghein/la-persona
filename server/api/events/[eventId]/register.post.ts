import { findEventByIdAndOrganizationId } from '~~/server/db/queries/event';
import {
  countCountedRegistrations,
  findRegistrationByEventAndUser,
  insertEventRegistration,
} from '~~/server/db/queries/event-registration';
import { handleApiError } from '~~/server/utils/errors';
import { requireCommunityOrganization } from '~~/server/utils/organization-permissions';
import { requireOrganizationPermission } from '~~/server/utils/organization-permissions';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';
import { eventStatus } from '~~/shared/utils/event-datetime';
import { enrichLog } from '~~/server/utils/wide-event';

export default defineEventHandler(async (event) => {
  const { session, org } = await requireCommunityOrganization(event);
  await requireOrganizationPermission(
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
    const row = await findEventByIdAndOrganizationId(eventId, org.id);
    if (!row) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Event not found',
      });
    }
    enrichLog(event, { event: { id: eventId, title: row.title } });

    if (row.registrationMode === 'closed') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Registration is closed for this event',
      });
    }

    if (eventStatus(row.endsAt) === 'past') {
      enrichLog(event, {
        registration: { event_id: eventId, result: 'event_ended' },
      });
      throw createError({
        statusCode: 403,
        statusMessage: 'This event has ended',
      });
    }

    const existing = await findRegistrationByEventAndUser(
      eventId,
      session.user.id
    );
    if (existing) {
      enrichLog(event, {
        registration: {
          event_id: eventId,
          registration_id: existing.id,
          result: 'already_registered',
        },
      });
      return existing;
    }

    const counted = await countCountedRegistrations(eventId);
    if (row.capacity != null && counted >= row.capacity) {
      throw createError({
        statusCode: 400,
        statusMessage: 'This event is at capacity',
      });
    }

    const status = row.approvalMode === 'manual' ? 'pending' : 'registered';
    const inserted = await insertEventRegistration({
      eventId,
      userId: session.user.id,
      status,
    });

    enrichLog(event, {
      registration: {
        event_id: eventId,
        registration_id: inserted?.id,
        result: status === 'pending' ? 'pending' : 'registered',
      },
    });

    return inserted;
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to register for event',
    });
  }
});
