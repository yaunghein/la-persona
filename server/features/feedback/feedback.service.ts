import { env } from '~~/env';
import { sendFeedbackReceivedEmail } from '~~/server/features/feedback/feedback.notifications';
import {
  deleteFeedback,
  insertFeedback,
  listFeedback,
} from '~~/server/features/feedback/feedback.repository';
import type { Collection } from '~~/shared/contracts/collection';
import type {
  CreateFeedbackRequest,
  FeedbackForReview,
  FeedbackKind,
} from '~~/shared/contracts/feedback';

/** Stores the submission and tells the team (when ADMIN_EMAILS is set). */
export async function submitFeedback(params: {
  request: CreateFeedbackRequest;
  organization: { id: string; name: string };
  submitter: { userId: string; name: string; email: string };
}) {
  const { request, organization, submitter } = params;
  const saved = await insertFeedback({
    ...request,
    organizationId: organization.id,
    userId: submitter.userId,
  });
  if (!saved) throw new Error('Feedback insert returned no row.');

  const recipients = [...env.ADMIN_EMAILS];
  const emails = recipients.length
    ? sendFeedbackReceivedEmail({
        kind: request.kind,
        message: request.message,
        submitterName: submitter.name || submitter.email,
        submitterEmail: submitter.email,
        organizationName: organization.name,
      })
    : null;
  return { feedbackId: saved.id, recipients, emails };
}

export async function listFeedbackForReview(filter: {
  kind?: FeedbackKind;
}): Promise<Collection<FeedbackForReview>> {
  const rows = await listFeedback(filter);
  return {
    items: rows.map((row) => ({
      ...row,
      kind: row.kind as FeedbackKind,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function removeFeedback(feedbackId: string) {
  const deleted = await deleteFeedback(feedbackId);
  if (!deleted) throw notFound('Message');
  return deleted;
}
