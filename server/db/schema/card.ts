import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import { user, organization } from './auth';

export const card = pgTable(
  'card',
  {
    id: text()
      .primaryKey()
      .notNull()
      .$default(() => nanoid()),
    firstName: text().notNull(),
    lastName: text(),
    slug: text().notNull().unique(),
    position: text().notNull(),
    splineUrl: text(),
    company: text(),
    phone: text(),
    email: text(),
    website: text(),
    avatarUrl: text(),
    socials: jsonb('socials')
      .$type<{ label: string; value: string }[]>()
      .default([]),
    wallpaperUrl: text(),
    cardBackUrl: text(),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text().references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('card_user_idx').on(table.userId)]
);
