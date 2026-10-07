import { and, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { card, cardUpdateRequest, user } from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { enrichLog } from '~~/server/utils/wide-event';

const WRITABLE = [
  'firstName',
  'lastName',
  'position',
  'phone',
  'email',
  'website',
] as const;

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const requestId = getRouterParam(event, 'id');
  if (!requestId) {
    throw createError({ statusCode: 400, statusMessage: 'Request id is required.' });
  }

  const existing = await db.query.cardUpdateRequest.findFirst({
    where: eq(cardUpdateRequest.id, requestId),
  });
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Request not found.' });
  }
  if (existing.status !== 'pending') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only pending update requests can be approved.',
    });
  }

  const patch: Record<string, string | null> = {};
  const fields: string[] = [];
  for (const field of WRITABLE) {
    const value = existing[field];
    if (value == null || value === '') continue;
    patch[field] = value;
    fields.push(field);
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    if (fields.length > 0) {
      await tx
        .update(card)
        .set({ ...patch, updatedAt: now })
        .where(eq(card.id, existing.cardId));
    }
    await tx
      .update(cardUpdateRequest)
      .set({ status: 'approved', updatedAt: now })
      .where(
        and(
          eq(cardUpdateRequest.id, requestId),
          eq(cardUpdateRequest.status, 'pending')
        )
      );
  });

  const requester = await db.query.user.findFirst({
    where: eq(user.id, existing.requestedBy),
    columns: { email: true },
  });

  enrichLog(event, {
    card_update_request: {
      id: requestId,
      card_id: existing.cardId,
      decision: 'approved',
      fields,
      ...(requester?.email ? { requester_email: requester.email } : {}),
    },
  });

  return { id: requestId, status: 'approved', fields };
});
