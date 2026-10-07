import { desc, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { feedbackSubmission, organization, user } from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';

const KINDS = new Set(['feedback', 'bug_report', 'feature_request']);

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const kind = String(getQuery(event).kind || '');

  const query = db
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
    .innerJoin(organization, eq(organization.id, feedbackSubmission.organizationId))
    .orderBy(desc(feedbackSubmission.createdAt));

  if (!KINDS.has(kind)) return query;

  return query.where(
    eq(feedbackSubmission.kind, kind as 'feedback' | 'bug_report' | 'feature_request')
  );
});
