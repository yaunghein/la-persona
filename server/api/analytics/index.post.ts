import { db } from '~~/server/db';
import { analytics } from '~~/server/db/schema';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  if (!body.cardId || !body.organizationId || !body.type) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing analytics data',
    });
  }

  await db.insert(analytics).values({
    cardId: body.cardId,
    organizationId: body.organizationId,
    userId: body.userId,
    type: body.type,
    metadata: body.metadata,
  });

  return { success: true };
});
