import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { card } from '~~/server/db/schema';
import { findFreeCardByUserId } from '~~/server/db/queries/card';
import { env } from '~~/server/utils/env';
import type { User } from '~~/shared/utils/type';

export const ensureUserHasFreeCard = async (user: User) => {
  const existing = await findFreeCardByUserId(user.id);
  if (existing) return existing;
  const values = {
    name: user.name,
    position: 'Please Edit Position',
    splineUrl: env.DEFAULT_SPLINE_URL,
    userId: user.id,
  };
  const [inserted] = await db.insert(card).values(values).returning();
  return inserted;
};

export async function updateCard(
  userId: string,
  input: z.infer<typeof UpdateCardSchema>
) {
  const { id, ...data } = input;
  const [updated] = await db
    .update(card)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(card.id, id), eq(card.userId, userId)))
    .returning();
  if (!updated) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    });
  }
  return updated;
}
