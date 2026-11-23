import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { card } from './card';

export const retiredCardSlug = pgTable('retired_card_slug', {
  slug: text().primaryKey().notNull(),
  cardId: text()
    .notNull()
    .references(() => card.id, { onDelete: 'cascade' }),
  retiredAt: timestamp().defaultNow().notNull(),
});
