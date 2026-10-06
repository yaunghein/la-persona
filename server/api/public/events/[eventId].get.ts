import { and, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { member } from '~~/server/db/schema';
import { findPublicEventById, toEventDTO } from '~~/server/db/queries/event';
import {
  findCardByUserIdAndOrganization,
  findOrganizationOwnerCardSlug,
} from '~~/server/db/queries/card';
import {
  findRegistrationByEventAndUser,
  toViewerStatus,
} from '~~/server/db/queries/event-registration';
import { handleApiError } from '~~/server/utils/errors';
import { auth } from '~~/server/auth';
import { isCommunityCardComplete } from '~~/shared/utils/event-flow';
import type { PublicEventDTO, PublicEventViewer } from '~~/shared/types/event';

async function buildViewer(
  userId: string,
  organizationId: string,
  eventId: string
): Promise<PublicEventViewer> {
  const [membership] = await db
    .select({ id: member.id })
    .from(member)
    .where(
      and(eq(member.userId, userId), eq(member.organizationId, organizationId))
    )
    .limit(1);

  if (!membership) {
    return {
      isMember: false,
      cardSlug: null,
      cardComplete: false,
      viewerRegistrationStatus: 'none',
    };
  }

  const [card, registration] = await Promise.all([
    findCardByUserIdAndOrganization(userId, organizationId),
    findRegistrationByEventAndUser(eventId, userId),
  ]);

  return {
    isMember: true,
    cardSlug: card?.slug || null,
    cardComplete: card ? isCommunityCardComplete(card) : false,
    viewerRegistrationStatus: toViewerStatus(registration?.status),
  };
}

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, 'eventId');

  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Event id is required',
    });
  }

  try {
    const row = await findPublicEventById(eventId);

    if (!row) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Event not found',
      });
    }

    const session = await auth.api.getSession({
      headers: event.headers,
    });

    const viewer = session?.user?.id
      ? await buildViewer(session.user.id, row.event.organizationId, eventId)
      : null;

    const organizerCardSlug = await findOrganizationOwnerCardSlug(
      row.event.organizationId
    );

    const payload: PublicEventDTO = {
      ...toEventDTO(row.event),
      organizer: {
        name: row.organizationName,
        logoUrl: row.organizationLogo,
        slug: row.organizationSlug,
        cardSlug: organizerCardSlug,
      },
      viewer,
    };

    return payload;
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to load event',
    });
  }
});
