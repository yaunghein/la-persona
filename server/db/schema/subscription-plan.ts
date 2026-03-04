import { pgTable, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';

export const subscriptionPlan = pgTable('subscription_plan', {
  id: text()
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid()),
  code: text().notNull().unique(),
  name: text().notNull(),
  billingCycle: text().default('yearly').notNull(),
  priceMinor: integer().notNull(),
  currency: text().default('MMK').notNull(),
  isActive: boolean().default(true).notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
