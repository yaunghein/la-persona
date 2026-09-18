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

  try {
    const row = await findEventByIdAndOrganizationId(eventId, org.id);
    if (!row) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Event not found',
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
    return updated;
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to approve registration',
    });
  }
});
