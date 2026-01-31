import { pgTable, text, timestamp, index, jsonb } from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import { user } from './auth';

export const cardRequest = pgTable(
  'card_request',
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => nanoid()),
    type: text().$type<'new_design' | 'existing_design'>().notNull(),
    status: text().default('pending').notNull(),
    paymentReceiptUrl: text('').notNull(),
    cardData: jsonb('card_data')
      .$type<{
        name?: string;
        position?: string;
        company?: string;
        phone?: string;
        email?: string;
        website?: string;
        socials?: { label: string; value: string }[];
      }>()
      .default({}),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('card_request_user_idx').on(table.userId)]
);
