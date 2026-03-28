import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import { card } from './card';
import { organization, user } from './auth';
import { subscriptionPlan } from './subscription-plan';

export const onboardingInvitation = pgTable(
  'onboarding_invitation',
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => nanoid()),
    email: text().notNull(),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    cardId: text()
      .notNull()
      .references(() => card.id, { onDelete: 'cascade' }),
    subscriptionPlanCode: text()
      .notNull()
      .references(() => subscriptionPlan.code, { onDelete: 'restrict' }),
    freeMonths: integer().notNull().default(0),
    expirationMinutes: integer().notNull(),
    expiresAt: timestamp().notNull(),
    status: text().notNull().default('pending'),
    createdByUserId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    acceptedByUserId: text().references(() => user.id, { onDelete: 'set null' }),
    acceptedAt: timestamp(),
    lastSentAt: timestamp(),
    resendCount: integer().notNull().default(0),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('onboarding_invitation_email_idx').on(table.email),
    index('onboarding_invitation_status_idx').on(table.status),
    index('onboarding_invitation_expires_at_idx').on(table.expiresAt),
    index('onboarding_invitation_org_idx').on(table.organizationId),
    index('onboarding_invitation_card_idx').on(table.cardId),
  ]
);
