import { and, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { member } from '~~/server/db/schema';
import { findPublicEventById } from '~~/server/db/queries/event';
import { findCardByUserIdAndOrganization } from '~~/server/db/queries/card';
import { addCommunityMember } from '~~/server/services/community';
import { handleApiError } from '~~/server/utils/errors';
import { requireSession } from '~~/server/utils/organization-permissions';
import { isCommunityCardComplete } from '~~/shared/utils/event-flow';
import {
  registrationBlockMessage,
  registrationBlockReason,
} from '~~/shared/utils/event-datetime';
import { countCountedRegistrations } from '~~/server/db/queries/event-registration';
import { enrichLog } from '~~/server/utils/wide-event';

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const eventId = getRouterParam(event, 'eventId');

  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Event id is required',
    });
  }
  enrichLog(event, { event: { id: eventId } });

  try {
    const row = await findPublicEventById(eventId);
    if (!row) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Event not found',
      });
    }
    enrichLog(event, {
      organization_name: row.organizationName,
      event: { title: row.event.title },
    });

    const block = registrationBlockReason({
      startsAt: row.event.startsAt,
      endsAt: row.event.endsAt,
      registrationMode: row.event.registrationMode,
      capacity: row.event.capacity,
      registeredCount: await countCountedRegistrations(eventId),
    });
    if (block) {
      enrichLog(event, { event: { result: block } });
      throw createError({
        statusCode: block === 'full' ? 400 : 403,
        statusMessage: registrationBlockMessage(block),
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

    enrichLog(event, {
      event: {
        organization_id: row.event.organizationId,
        already_member: Boolean(existing),
        ...(card?.slug ? { card_slug: card.slug } : {}),
      },
    });

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
