import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import { user, organization } from './auth';
import { department } from './department';

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
    phoneCountryCode: text(),
    email: text(),
    website: text(),
    avatarUrl: text(),
    socials: jsonb('socials')
      .$type<{ label: string; value: string }[]>()
      .default([]),
    wallpaperUrl: text(),
    cardBackUrl: text(),
    visibility: text()
      .$type<'public' | 'members'>()
      .notNull()
      .default('public'),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    departmentId: text().references(() => department.id, {
      onDelete: 'set null',
    }),
    userId: text().references(() => user.id, { onDelete: 'set null' }),
    // Set when the holder deletes the card or leaves its community. The row
    // stays (slug reserved, user_id kept) so the contacts it collected survive.
    removedAt: timestamp(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('card_user_idx').on(table.userId),
    index('card_department_idx').on(table.departmentId),
  ]
);
