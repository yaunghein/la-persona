import { desc, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { feedbackSubmission, organization, user } from '~~/server/db/schema';
import type { FeedbackKind } from '~~/shared/contracts/feedback';

export async function insertFeedback(values: {
  kind: FeedbackKind;
  message: string;
  organizationId: string;
  userId: string;
}) {
  const [row] = await db.insert(feedbackSubmission).values(values).returning();
  return row ?? null;
}

export function listFeedback(filter: { kind?: FeedbackKind }) {
  return db
    .select({
      id: feedbackSubmission.id,
      kind: feedbackSubmission.kind,
      message: feedbackSubmission.message,
      createdAt: feedbackSubmission.createdAt,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      organizationId: organization.id,
      organizationName: organization.name,
      organizationSlug: organization.slug,
    })
    .from(feedbackSubmission)
    .innerJoin(user, eq(user.id, feedbackSubmission.userId))
    .innerJoin(
      organization,
      eq(organization.id, feedbackSubmission.organizationId)
    )
    .where(filter.kind ? eq(feedbackSubmission.kind, filter.kind) : undefined)
    .orderBy(desc(feedbackSubmission.createdAt));
}

export async function deleteFeedback(feedbackId: string) {
  const [row] = await db
    .delete(feedbackSubmission)
    .where(eq(feedbackSubmission.id, feedbackId))
    .returning({
      id: feedbackSubmission.id,
      kind: feedbackSubmission.kind,
      userId: feedbackSubmission.userId,
    });
  return row ?? null;
}
