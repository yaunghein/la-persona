import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { feedbackSubmission } from '~~/server/db/schema';

export type FeedbackKind = 'feedback' | 'bug_report' | 'feature_request';

export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  feedback: 'Give Feedback',
  bug_report: 'Report a Bug',
  feature_request: 'Feature Request',
};

export type SelectFeedbackSubmission = InferSelectModel<typeof feedbackSubmission>;
export type InsertFeedbackSubmission = InferInsertModel<typeof feedbackSubmission>;
export type UpdateFeedbackSubmission = Partial<InsertFeedbackSubmission>;

export type FeedbackSubmissionDTO = Omit<
  SelectFeedbackSubmission,
  'createdAt' | 'updatedAt'
> & {
  createdAt: string;
  updatedAt: string;
};

const feedbackMessageSchema = z
  .string()
  .trim()
  .min(10, 'Please provide at least 10 characters.')
  .max(4000, 'Feedback must be under 4000 characters.');

export const feedbackSubmissionSelectSchema =
  createSelectSchema(feedbackSubmission);

export const feedbackSubmissionInsertSchema = createInsertSchema(
  feedbackSubmission,
  {
    kind: z.enum(['feedback', 'bug_report', 'feature_request']),
    message: feedbackMessageSchema,
  }
).omit({ organizationId: true, userId: true });

export const feedbackSubmissionUpdateSchema = createUpdateSchema(
  feedbackSubmission,
  {
    message: feedbackMessageSchema,
  }
);
