import { z } from 'zod';
import { findCardBySlugAndOrganization } from '~~/server/db/queries/card';
import { findEventByIdAndOrganizationId } from '~~/server/db/queries/event';
import {
  findRegistrationByEventAndUser,
  updateEventRegistrationStatus,
} from '~~/server/db/queries/event-registration';
import { queueEventCheckInEmail } from '~~/server/services/event-check-in-email';
import { handleApiError } from '~~/server/utils/errors';
import { requireCommunityOrganization } from '~~/server/utils/organization-permissions';
import { requireOrganizationPermission } from '~~/server/utils/organization-permissions';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';
import { eventPhase } from '~~/shared/utils/event-datetime';
import { parseCardSlugFromQr } from '~~/shared/utils/card-qr';
import { enrichLog } from '~~/server/utils/wide-event';

const bodySchema = z.object({
  code: z.string().trim().min(1, 'QR code is required'),
});

export default defineEventHandler(async (event) => {
  const { org } = await requireCommunityOrganization(event);
  await requireOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.CHECK_IN_CREATE
  );
  const eventId = getRouterParam(event, 'eventId');
  const body = await readValidatedBody(event, bodySchema.safeParse);

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
    const row = await findEventByIdAndOrganizationId(eventId, org.id);
    if (!row) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Event not found',
      });
    }
    enrichLog(event, { event: { id: eventId, title: row.title } });

    const phase = eventPhase(row.startsAt, row.endsAt);
    if (phase !== 'live') {
      enrichLog(event, { registration: { result: phase } });
      throw createError({
        statusCode: 403,
        statusMessage:
          phase === 'before'
            ? 'Check-in opens when the event starts'
            : 'This event has ended',
      });
    }

    const slug = parseCardSlugFromQr(body.data.code);
    if (!slug) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Attendee not found',
      });
    }

    const communityCard = await findCardBySlugAndOrganization(slug, org.id);
    if (!communityCard?.userId) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Attendee not found',
      });
    }

    const registration = await findRegistrationByEventAndUser(
      eventId,
      communityCard.userId
    );

    if (!registration || registration.status === 'pending') {
      throw createError({
        statusCode: 404,
        statusMessage: 'Attendee not found',
      });
    }

    if (registration.status === 'checked_in') {
      enrichLog(event, {
        registration: {
          event_id: eventId,
          registration_id: registration.id,
          result: 'checked_in',
        },
      });
      return registration;
    }

    const checkedInAt = new Date();
    const updated = await updateEventRegistrationStatus(
      registration.id,
      'checked_in',
      { checkedInAt }
    );

    enrichLog(event, {
      registration: {
        event_id: eventId,
        registration_id: updated?.id ?? registration.id,
        result: 'checked_in',
      },
    });

    // Only a first check-in reaches here; repeat scans returned above.
    if (updated) {
      await queueEventCheckInEmail(event, {
        userId: communityCard.userId,
        cardFirstName: communityCard.firstName,
        event: { id: eventId, title: row.title },
        organization: { id: org.id, slug: org.slug },
        checkedInAt,
      });
    }

    return updated;
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to check in attendee',
    });
  }
});
