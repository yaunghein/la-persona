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
import { parseCardSlugFromQr } from '~~/shared/utils/card-qr';

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

    const slug = parseCardSlugFromQr(body.data.code);
    if (!slug) {
      return { status: 'not_found' as const };
    }

    const communityCard = await findCardBySlugAndOrganization(slug, org.id);
    if (!communityCard?.userId) {
      return { status: 'not_found' as const };
    }

    const registration = await findRegistrationByEventAndUser(
      eventId,
      communityCard.userId
    );

    if (!registration || registration.status === 'pending') {
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
      email: communityCard.email,
      website: communityCard.website,
      planCode: subscription?.planCode || null,
      checkedInAt: registration.checkedInAt?.toISOString() ?? null,
    };

    if (registration.status === 'checked_in') {
      return { status: 'already' as const, attendee };
    }

    return { status: 'ready' as const, attendee };
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to look up attendee',
    });
  }
});
