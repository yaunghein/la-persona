import { pgTable, text, timestamp, index, jsonb } from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import { card, user, organization } from '../schema';

export const analytics = pgTable(
  'analytics',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => nanoid()),
    type: text('type')
      .$type<'view' | 'social_click' | 'link_click' | 'save_action'>()
      .notNull(),
    metadata: jsonb('metadata').$type<{
      platform?: string;
      label?: string;
      action?: string;
      url?: string;
    }>(),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    cardId: text()
      .notNull()
      .references(() => card.id, { onDelete: 'cascade' }),
    userId: text().references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('analytics_org_idx').on(table.organizationId),
    index('analytics_card_idx').on(table.cardId),
    index('analytics_type_date_idx').on(table.type, table.createdAt),
  ]
);
