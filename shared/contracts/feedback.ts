import { z } from 'zod';

export const FEEDBACK_KINDS = [
  'feedback',
  'bug_report',
  'feature_request',
] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  feedback: 'Give Feedback',
  bug_report: 'Report a Bug',
  feature_request: 'Feature Request',
};

export const CreateFeedbackRequest = z.object({
  kind: z.enum(FEEDBACK_KINDS),
  message: z
    .string()
    .trim()
    .min(10, 'Please provide at least 10 characters.')
    .max(4000, 'Feedback must be under 4000 characters.'),
});

export type CreateFeedbackRequest = z.infer<typeof CreateFeedbackRequest>;

export const FeedbackRouteParams = z.object({
  feedbackId: z.string().trim().min(1),
});

export const ListFeedbackQuery = z.object({
  kind: z.enum(FEEDBACK_KINDS).optional(),
});

export type FeedbackForReview = {
  id: string;
  kind: FeedbackKind;
  message: string;
  createdAt: string;
  userId: string;
  userName: string;
  userEmail: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
};
