import { asc } from 'drizzle-orm';
import { db } from '~~/server/db';
import { organization } from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);

  return await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    })
    .from(organization)
    .orderBy(asc(organization.name));
});
