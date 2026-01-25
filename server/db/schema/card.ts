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
    name: text().notNull(),
    position: text().notNull(),
    splineUrl: text(),
    type: text().default('standard').notNull(),
    company: text(),
    phone: text(),
    email: text(),
    website: text(),
    avatarUrl: text(),
    socials: jsonb('socials')
      .$type<{ label: string; value: string }[]>()
      .default([]),
    organizationId: text().references(() => organization.id, {
      onDelete: 'cascade',
    }),
    userId: text().references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('card_user_idx').on(table.userId)]
);
