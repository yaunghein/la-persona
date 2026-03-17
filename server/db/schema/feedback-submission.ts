import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import { organization, user } from './auth';

export const feedbackSubmission = pgTable(
  'feedback_submission',
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => nanoid()),
    kind: text().$type<'feedback' | 'bug_report' | 'feature_request'>().notNull(),
    message: text().notNull(),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('feedback_submission_org_idx').on(table.organizationId),
    index('feedback_submission_user_idx').on(table.userId),
    index('feedback_submission_kind_idx').on(table.kind),
  ]
);
