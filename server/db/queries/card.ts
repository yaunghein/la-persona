import { and, eq, desc } from 'drizzle-orm';
import { db } from '../../db';
import { card } from '../schema';

export const findFreeCardByUserId = (userId: string) => {
  return db.query.card.findFirst({
    where: and(eq(card.userId, userId), eq(card.type, 'free')),
  });
};

export const findCardsByUserId = async (userId: string) => {
  return await db.query.card.findMany({
    where: eq(card.userId, userId),
    orderBy: desc(card.createdAt),
  });
};

export const findCardsById = async (id: string) => {
  return await db.query.card.findFirst({
    where: eq(card.id, id),
  });
};
