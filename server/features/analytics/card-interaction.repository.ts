import { db } from '~~/server/db';
import { analytics } from '~~/server/db/schema';

export async function insertCardInteraction(
  values: typeof analytics.$inferInsert
) {
  await db.insert(analytics).values(values);
}
