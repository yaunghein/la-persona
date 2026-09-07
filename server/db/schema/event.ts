import { pgTable, text, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import { organization, user } from './auth';

export const event = pgTable(
  'event',
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => nanoid()),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text().references(() => user.id, { onDelete: 'set null' }),
    title: text().notNull(),
    description: text(),
    location: text().notNull(),
    startsAt: timestamp().notNull(),
    endsAt: timestamp().notNull(),
    capacity: integer(),
    coverUrl: text().notNull(),
    photoUrls: jsonb().$type<string[]>().default([]).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('event_organization_idx').on(table.organizationId),
    index('event_starts_at_idx').on(table.startsAt),
    index('event_user_idx').on(table.userId),
  ]
);
