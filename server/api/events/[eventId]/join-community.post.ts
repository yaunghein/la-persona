import { and, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { member } from '~~/server/db/schema';
import { findPublicEventById } from '~~/server/db/queries/event';
import { findCardByUserIdAndOrganization } from '~~/server/db/queries/card';
import { addCommunityMember } from '~~/server/services/community';
import { handleApiError } from '~~/server/utils/errors';
import { requireSession } from '~~/server/utils/organization-permissions';
import { isCommunityCardComplete } from '~~/shared/utils/event-flow';

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
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

    if (row.event.registrationMode === 'closed') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Registration is closed for this event',
      });
    }

    if (row.event.registrationMode === 'invite_only') {
      throw createError({
        statusCode: 403,
        statusMessage: 'This event is invite only',
      });
    }

    const existing = await db
      .select({ id: member.id })
      .from(member)
      .where(
        and(
          eq(member.userId, session.user.id),
          eq(member.organizationId, row.event.organizationId)
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    await addCommunityMember(session.user.id, row.event.organizationId);
    const card = await findCardByUserIdAndOrganization(
      session.user.id,
      row.event.organizationId
    );

    return {
      organizationSlug: row.organizationSlug,
      eventId,
      cardSlug: card?.slug || null,
      alreadyMember: Boolean(existing),
      cardComplete: card ? isCommunityCardComplete(card) : false,
    };
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to join community',
    });
  }
});
