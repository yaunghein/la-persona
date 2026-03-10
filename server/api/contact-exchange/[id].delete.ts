import { and, eq } from 'drizzle-orm';
import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import { card, contactExchange, member } from '~~/server/db/schema';

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session || !session.session.activeOrganizationId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Contact id is required.',
    });
  }

  const orgId = session.session.activeOrganizationId;
  const userId = session.user.id;

  const userMemberInfo = await db.query.member.findFirst({
    where: and(eq(member.organizationId, orgId), eq(member.userId, userId)),
  });
  if (!userMemberInfo) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }
  const isOwner = userMemberInfo.role === 'owner';

  const target = await db
    .select({
      id: contactExchange.id,
      cardId: contactExchange.cardId,
      cardOrgId: card.organizationId,
      cardUserId: card.userId,
    })
    .from(contactExchange)
    .leftJoin(card, eq(contactExchange.cardId, card.id))
    .where(eq(contactExchange.id, id))
    .limit(1);

  const row = target[0];
  if (!row) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Contact not found.',
    });
  }

  if (row.cardId === null) {
    if (!isOwner) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only organization owners can delete manual contacts.',
      });
    }
  } else {
    if (!row.cardOrgId || row.cardOrgId !== orgId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have access to this contact.',
      });
    }
    if (!isOwner && row.cardUserId !== userId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have access to this contact.',
      });
    }
  }

  await db.delete(contactExchange).where(eq(contactExchange.id, id));

  return { success: true };
});
