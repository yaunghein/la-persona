import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { member } from '~~/server/db/schema';

export async function getMembersByUserId(userId: string) {
  return await db.select().from(member).where(eq(member.userId, userId));
}
