import { db } from '~~/server/db';
import { userDailyActivity } from '~~/server/db/schema';

/** Idempotent: one row per user per Yangon calendar day. */
export async function insertDailyActivity(userId: string, day: string) {
  await db
    .insert(userDailyActivity)
    .values({ userId, day })
    .onConflictDoNothing();
}
