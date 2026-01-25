import { nanoid } from 'nanoid';
import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { user, card } from '../schema';

export const cardUpdateRequest = pgTable(
  'card_update_request',
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => nanoid()),
    firstName: text(),
    lastName: text(),
    position: text(),
    phone: text(),
    email: text(),
    website: text(),
    note: text(),
    status: text().default('pending').notNull(),
    cardId: text()
      .notNull()
      .references(() => card.id, { onDelete: 'cascade' }),
    requestedBy: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('update_request_card_idx').on(table.cardId),
    index('update_request_user_idx').on(table.requestedBy),
  ]
);
