import { and, eq } from 'drizzle-orm';
import { db } from '../../db';
import { card } from '../schema';

export const findFreeCardByUserId = (userId: string) => {
  return db.query.card.findFirst({
    where: and(eq(card.userId, userId), eq(card.type, 'free')),
  });
};
