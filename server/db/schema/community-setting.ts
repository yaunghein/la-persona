import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import { organization } from './auth';

export const communitySetting = pgTable(
  'community_setting',
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => nanoid()),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    coverUrl: text(),
    description: text().default('').notNull(),
    guidelines: text().default('').notNull(),
    whyJoin: text().default('').notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('community_setting_organization_uidx').on(table.organizationId),
  ]
);
