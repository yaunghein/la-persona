import { asc } from 'drizzle-orm';
import { db } from '~~/server/db';
import { user } from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);

  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(user)
    .orderBy(asc(user.name));

  return users.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    label: row.name ? `${row.name} (${row.email})` : row.email,
    avatar: row.image ? { src: row.image } : undefined,
  }));
});
