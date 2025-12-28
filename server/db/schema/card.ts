import { pgTable, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import { user } from './auth';

export const cardTypeEnum = pgEnum('card_type', ['free', 'premium']);

export const card = pgTable(
  'card',
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => nanoid()),
    name: text().notNull(),
    position: text().notNull(),
    splineUrl: text(),
    type: cardTypeEnum().notNull().default('free'),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('card_user_idx').on(table.userId)]
);
