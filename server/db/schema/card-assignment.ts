import { sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import { user } from './auth';
import { card } from './card';

export const cardAssignment = pgTable(
  'card_assignment',
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => nanoid()),
    cardId: text()
      .notNull()
      .references(() => card.id, { onDelete: 'cascade' }),
    userId: text().references(() => user.id, { onDelete: 'set null' }),
    holderName: text().notNull(),
    holderEmail: text().notNull(),
    startedAt: timestamp().notNull(),
    endedAt: timestamp(),
    endedByUserId: text().references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (table) => [
    index('card_assignment_card_idx').on(table.cardId),
    index('card_assignment_user_idx').on(table.userId),
    uniqueIndex('card_assignment_open_uidx')
      .on(table.cardId)
      .where(sql`${table.endedAt} IS NULL`),
  ]
);
