import { isNull } from 'drizzle-orm';
import { db } from '~~/server/db';
import { card } from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);

  const rows = await db.query.card.findMany({
    where: isNull(card.userId),
    columns: {
      id: true,
      firstName: true,
      lastName: true,
      position: true,
      slug: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    label: `${row.firstName} ${row.lastName || ''}`.trim(),
    subtitle: row.position || '',
  }));
});
