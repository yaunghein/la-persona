import { and, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { cardUpdateRequest, user } from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { enrichLog } from '~~/server/utils/wide-event';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const requestId = getRouterParam(event, 'id');
  if (!requestId) {
    throw createError({ statusCode: 400, statusMessage: 'Request id is required.' });
  }

  const existing = await db.query.cardUpdateRequest.findFirst({
    where: eq(cardUpdateRequest.id, requestId),
    columns: { id: true, status: true, cardId: true, requestedBy: true },
  });
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Request not found.' });
  }
  if (existing.status !== 'pending') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only pending update requests can be declined.',
    });
  }

  await db
    .update(cardUpdateRequest)
    .set({ status: 'declined', updatedAt: new Date() })
    .where(
      and(eq(cardUpdateRequest.id, requestId), eq(cardUpdateRequest.status, 'pending'))
    );

  const requester = await db.query.user.findFirst({
    where: eq(user.id, existing.requestedBy),
    columns: { email: true },
  });

  enrichLog(event, {
    card_update_request: {
      id: requestId,
      card_id: existing.cardId,
      decision: 'declined',
      ...(requester?.email ? { requester_email: requester.email } : {}),
    },
  });

  return { id: requestId, status: 'declined' };
});
