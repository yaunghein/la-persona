import { pgTable, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import { card } from './card';
import { subscriptionPaymentItem } from './subscription-payment';
import { subscriptionPlan } from './subscription-plan';

export const cardSubscription = pgTable(
  'card_subscription',
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => nanoid()),
    cardId: text()
      .notNull()
      .unique()
      .references(() => card.id, { onDelete: 'cascade' }),
    planCode: text().references(() => subscriptionPlan.code, {
      onDelete: 'set null',
    }),
    status: text().default('trial').notNull(),
    isTrial: boolean().default(true).notNull(),
    trialStartAt: timestamp(),
    trialEndAt: timestamp(),
    currentPeriodStartAt: timestamp(),
    currentPeriodEndAt: timestamp(),
    lastPaymentItemId: text().references(() => subscriptionPaymentItem.id, {
      onDelete: 'set null',
    }),
    activatedAt: timestamp(),
    expiredAt: timestamp(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('card_subscription_status_idx').on(table.status),
    index('card_subscription_period_end_idx').on(table.currentPeriodEndAt),
  ]
);
