import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import { card } from './card';

export const invitation = pgTable('invitation', {
  id: text()
    .primaryKey()
    .notNull()
    .$default(() => nanoid()),
  cardId: text()
    .notNull()
    .references(() => card.id, { onDelete: 'cascade' }),
  expiresAt: timestamp().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
});
