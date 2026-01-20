import { isNull } from 'drizzle-orm';
import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import { card } from '~~/server/db/schema';

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

  return await db.query.card.findMany({
    where: isNull(card.userId),
    columns: {
      id: true,
      name: true,
      type: true,
    },
  });
});
