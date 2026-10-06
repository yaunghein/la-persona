import { count, desc, eq, getTableColumns, inArray } from 'drizzle-orm';
import { db } from '~~/server/db';
import { card, contactExchange } from '~~/server/db/schema';

export async function getAllContactExchangesForUser(userId: string) {
  return db
    .select({
      ...getTableColumns(contactExchange),
      cardId: card.id,
      cardSlug: card.slug,
      cardFirstName: card.firstName,
      cardLastName: card.lastName,
    })
    .from(contactExchange)
    .innerJoin(card, eq(contactExchange.cardId, card.id))
    .where(eq(card.userId, userId))
    .orderBy(desc(contactExchange.createdAt));
}

export async function countContactsByCardIds(cardIds: string[]) {
  if (cardIds.length === 0) return new Map<string, number>();

  const rows = await db
    .select({
      cardId: contactExchange.cardId,
      value: count(),
    })
    .from(contactExchange)
    .where(inArray(contactExchange.cardId, cardIds))
    .groupBy(contactExchange.cardId);

  return new Map(
    rows.flatMap((row) =>
      row.cardId ? [[row.cardId, Number(row.value)] as const] : []
    )
  );
}
