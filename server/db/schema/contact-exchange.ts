import { pgTable, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import { user } from './auth';
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
    company: text(),
    position: text(),
    cardId: text().references(() => card.id, { onDelete: 'cascade' }),
    source: text().default('public_form').notNull(),
    laPersonaUserId: text().references(() => user.id, { onDelete: 'set null' }),
    laPersonaCardId: text().references(() => card.id, { onDelete: 'set null' }),
    reciprocalExchangeId: text(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('contact_exchange_card_idx').on(table.cardId),
    index('contact_exchange_la_persona_user_idx').on(table.laPersonaUserId),
    uniqueIndex('contact_exchange_card_la_persona_user_uidx').on(
      table.cardId,
      table.laPersonaUserId
    ),
  ]
);
