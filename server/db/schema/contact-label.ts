import { sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import { user } from './auth';
import { contactExchange } from './contact-exchange';

/** A user's own labels, shared across all of their cards and visible only to them. */
export const contactLabel = pgTable(
  'contact_label',
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => nanoid()),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    color: varchar({ length: 7 }).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('contact_label_user_name_uidx').on(
      table.userId,
      sql`lower(${table.name})`
    ),
  ]
);

export const contactLabelAssignment = pgTable(
  'contact_label_assignment',
  {
    contactId: text()
      .notNull()
      .references(() => contactExchange.id, { onDelete: 'cascade' }),
    labelId: text()
      .notNull()
      .references(() => contactLabel.id, { onDelete: 'cascade' }),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.contactId, table.labelId] }),
    index('contact_label_assignment_label_idx').on(table.labelId),
  ]
);
