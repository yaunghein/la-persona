import { findEventByIdAndOrganizationId } from '~~/server/db/queries/event';
import {
  countCountedRegistrations,
  findRegistrationByIdAndEvent,
  updateEventRegistrationStatus,
} from '~~/server/db/queries/event-registration';
import { handleApiError } from '~~/server/utils/errors';
import { requireCommunityOrganization } from '~~/server/utils/organization-permissions';
import { requireOrganizationPermission } from '~~/server/utils/organization-permissions';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';
import { eventStatus } from '~~/shared/utils/event-datetime';
import { enrichLog } from '~~/server/utils/wide-event';

export default defineEventHandler(async (event) => {
  const { org } = await requireCommunityOrganization(event);
  await requireOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.EVENT_UPDATE
  );
  const eventId = getRouterParam(event, 'eventId');
  const registrationId = getRouterParam(event, 'registrationId');

  if (!eventId || !registrationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Event id and registration id are required',
    });
  }
  enrichLog(event, {
    registration: { event_id: eventId, registration_id: registrationId },
  });

  try {
    const row = await findEventByIdAndOrganizationId(eventId, org.id);
    if (!row) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Event not found',
      });
    }
    enrichLog(event, { event: { id: eventId, title: row.title } });

    if (eventStatus(row.endsAt) === 'past') {
      enrichLog(event, { registration: { result: 'event_ended' } });
      throw createError({
        statusCode: 403,
        statusMessage: 'This event has ended',
      });
    }

    const registration = await findRegistrationByIdAndEvent(
      registrationId,
      eventId
    );
    if (!registration) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Registration not found',
      });
    }

    if (registration.status !== 'pending') {
      enrichLog(event, { registration: { result: registration.status } });
      return registration;
    }

    const counted = await countCountedRegistrations(eventId);
    if (row.capacity != null && counted >= row.capacity) {
      throw createError({
        statusCode: 400,
        statusMessage: 'This event is at capacity',
      });
    }

    const updated = await updateEventRegistrationStatus(
      registration.id,
      'registered'
    );
    enrichLog(event, { registration: { result: 'registered' } });
    return updated;
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to approve registration',
    });
  }
});
