import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import type { BackgroundTheme } from '~~/shared/utils/constants';
import { organization } from './auth';

export const companySetting = pgTable(
  'company_setting',
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => nanoid()),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    website: text().default('').notNull(),
    coverUrl: text(),
    splineUrl: text().default('').notNull(),
    backgroundTheme: text().$type<BackgroundTheme>().default('dark').notNull(),
    wallpaperUrl: text().default('').notNull(),
    cardBackUrl: text().default('').notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('company_setting_organization_uidx').on(table.organizationId),
  ]
);
