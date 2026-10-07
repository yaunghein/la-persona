import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { cardSubscription } from '~~/server/db/schema';
import { findCardBySlugAndOrganization } from '~~/server/db/queries/card';
import { findEventByIdAndOrganizationId } from '~~/server/db/queries/event';
import { findRegistrationByEventAndUser } from '~~/server/db/queries/event-registration';
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
    ORGANIZATION_PERMISSIONS.EVENT_UPDATE
  );
  const eventId = getRouterParam(event, 'eventId');
  const body = await readValidatedBody(event, bodySchema.safeParse);

  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Event id is required',
    });
  }
  enrichLog(event, { registration: { event_id: eventId } });

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
      enrichLog(event, { registration: { result: 'not_found' } });
      return { status: 'not_found' as const };
    }

    const communityCard = await findCardBySlugAndOrganization(slug, org.id);
    if (!communityCard?.userId) {
      enrichLog(event, { registration: { result: 'not_found' } });
      return { status: 'not_found' as const };
    }

    const registration = await findRegistrationByEventAndUser(
      eventId,
      communityCard.userId
    );

    if (!registration || registration.status === 'pending') {
      enrichLog(event, {
        registration: { result: 'not_found', card_slug: communityCard.slug },
      });
      return {
        status: 'not_found' as const,
        slug: communityCard.slug,
      };
    }

    const subscription = await db.query.cardSubscription.findFirst({
      where: eq(cardSubscription.cardId, communityCard.id),
      columns: { planCode: true },
    });

    const attendee = {
      id: registration.id,
      name: [communityCard.firstName, communityCard.lastName]
        .filter(Boolean)
        .join(' ')
        .trim(),
      role: communityCard.position || 'Member',
      company: communityCard.company || '',
      splineUrl: communityCard.splineUrl,
      slug: communityCard.slug,
      firstName: communityCard.firstName,
      lastName: communityCard.lastName,
      position: communityCard.position,
      phone: communityCard.phone,
      phoneCountryCode: communityCard.phoneCountryCode,
      email: communityCard.email,
      website: communityCard.website,
      planCode: subscription?.planCode || null,
      checkedInAt: registration.checkedInAt?.toISOString() ?? null,
    };

    if (registration.status === 'checked_in') {
      enrichLog(event, {
        registration: {
          registration_id: registration.id,
          result: 'already',
          card_slug: communityCard.slug,
        },
      });
      return { status: 'already' as const, attendee };
    }

    enrichLog(event, {
      registration: {
        registration_id: registration.id,
        result: 'ready',
        card_slug: communityCard.slug,
      },
    });
    return { status: 'ready' as const, attendee };
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to look up attendee',
    });
  }
});
