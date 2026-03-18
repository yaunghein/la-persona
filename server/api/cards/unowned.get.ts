import { isNull } from 'drizzle-orm';
import { db } from '~~/server/db';
import { card } from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);

  return await db.query.card.findMany({
    where: isNull(card.userId),
    columns: {
      id: true,
      name: true,
      type: true,
    },
  });
});
