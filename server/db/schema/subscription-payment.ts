import { pgTable, text, timestamp, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import { organization, user } from './auth';
import { card } from './card';
import { cardRequest } from './card-request';
import { subscriptionPlan } from './subscription-plan';

export const subscriptionPayment = pgTable(
  'subscription_payment',
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => nanoid()),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    paidByUserId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    requestId: text().references(() => cardRequest.id, { onDelete: 'set null' }),
    receiptUrl: text().notNull(),
    paymentReference: text(),
    paymentMethod: text(),
    status: text().default('submitted').notNull(),
    note: text(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('subscription_payment_org_idx').on(table.organizationId),
    index('subscription_payment_payer_idx').on(table.paidByUserId),
    index('subscription_payment_status_idx').on(table.status),
  ]
);

export const subscriptionPaymentItem = pgTable(
  'subscription_payment_item',
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => nanoid()),
    paymentId: text()
      .notNull()
      .references(() => subscriptionPayment.id, { onDelete: 'cascade' }),
    cardId: text()
      .notNull()
      .references(() => card.id, { onDelete: 'cascade' }),
    planCode: text()
      .notNull()
      .references(() => subscriptionPlan.code, { onDelete: 'restrict' }),
    termYears: integer().default(1).notNull(),
    startAt: timestamp().notNull(),
    endAt: timestamp().notNull(),
    amountMinor: integer().notNull(),
    currency: text().default('MMK').notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('subscription_payment_item_payment_idx').on(table.paymentId),
    index('subscription_payment_item_card_idx').on(table.cardId),
    uniqueIndex('subscription_payment_item_payment_card_uidx').on(
      table.paymentId,
      table.cardId
    ),
  ]
);
