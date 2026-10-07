import { findEventByIdAndOrganizationId } from '~~/server/db/queries/event';
import {
  deleteEventRegistration,
  findRegistrationByEventAndUser,
} from '~~/server/db/queries/event-registration';
import { handleApiError } from '~~/server/utils/errors';
import { requireCommunityOrganization } from '~~/server/utils/organization-permissions';
import { requireOrganizationPermission } from '~~/server/utils/organization-permissions';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';
import { enrichLog } from '~~/server/utils/wide-event';

export default defineEventHandler(async (event) => {
  const { session, org } = await requireCommunityOrganization(event);
  await requireOrganizationPermission(event, ORGANIZATION_PERMISSIONS.EVENT_READ);
  const eventId = getRouterParam(event, 'eventId');

  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Event id is required',
    });
  }
  enrichLog(event, { registration: { event_id: eventId, result: 'unregistered' } });

  try {
    const row = await findEventByIdAndOrganizationId(eventId, org.id);
    if (!row) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Event not found',
      });
    }
    enrichLog(event, { event: { id: eventId, title: row.title } });

    const existing = await findRegistrationByEventAndUser(
      eventId,
      session.user.id
    );
    if (!existing) {
      enrichLog(event, { registration: { result: 'not_registered' } });
      return { success: true };
    }

    enrichLog(event, { registration: { registration_id: existing.id } });

    if (existing.status === 'checked_in') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Checked-in attendees cannot unregister',
      });
    }

    await deleteEventRegistration(eventId, session.user.id);
    return { success: true };
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to unregister',
    });
  }
});
