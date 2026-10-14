import { z } from 'zod';
import { findEventByIdAndOrganizationId } from '~~/server/db/queries/event';
import { queueEventBroadcastEmail } from '~~/server/services/event-broadcast-email';
import { handleApiError } from '~~/server/utils/errors';
import {
  requireCommunityOrganization,
  requireOrganizationPermission,
} from '~~/server/utils/organization-permissions';
import { enrichLog } from '~~/server/utils/wide-event';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';
import { EVENT_BROADCAST_KINDS } from '~~/shared/types/event';
import { eventPhase } from '~~/shared/utils/event-datetime';

const bodySchema = z.object({
  kind: z.enum(EVENT_BROADCAST_KINDS),
});

export default defineEventHandler(async (event) => {
  const { org } = await requireCommunityOrganization(event);
  await requireOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.EVENT_UPDATE
  );

  const eventId = getRouterParam(event, 'eventId');
  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Event id is required',
    });
  }

  const body = await readValidatedBody(event, bodySchema.safeParse);
  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: body.error.issues.map((issue) => issue.path.join('.')),
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
    if (body.data.kind === 'reminder' && phase === 'past') {
      throw createError({
        statusCode: 400,
        statusMessage: 'This event has ended',
      });
    }
    if (body.data.kind === 'after_event' && phase === 'before') {
      throw createError({
        statusCode: 400,
        statusMessage: 'This event has not started yet',
      });
    }

    return await queueEventBroadcastEmail(event, {
      kind: body.data.kind,
      event: { id: eventId, title: row.title },
      organization: { id: org.id, slug: org.slug },
    });
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to send event email',
    });
  }
});
