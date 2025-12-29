import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import { card } from './card';

export const contactExchange = pgTable(
  'contact_exchange',
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => nanoid()),
    name: text().notNull(),
    phone: text().notNull(),
    email: text(),
    position: text(),
    cardId: text()
      .notNull()
      .references(() => card.id, { onDelete: 'cascade' }),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('contact_exchange_card_idx').on(table.cardId)]
);
