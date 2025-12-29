import { desc, eq, getTableColumns } from 'drizzle-orm';
import { db } from '~~/server/db';
import { card, contactExchange } from '~~/server/db/schema';

export async function getAllContactExchangesForUser(userId: string) {
  return db
    .select({
      ...getTableColumns(contactExchange),
      cardId: card.id,
    })
    .from(contactExchange)
    .innerJoin(card, eq(contactExchange.cardId, card.id))
    .where(eq(card.userId, userId))
    .orderBy(desc(contactExchange.createdAt));
}
