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
    inviteToken: text()
      .notNull()
      .$defaultFn(() => nanoid()),
    splineUrl: text().default('').notNull(),
    wallpaperUrl: text().default('').notNull(),
    cardBackUrl: text().default('').notNull(),
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
    uniqueIndex('community_setting_invite_token_uidx').on(table.inviteToken),
  ]
);
