import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { feedbackSubmission, user } from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { enrichLog } from '~~/server/utils/wide-event';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Feedback id is required' });
  }

  const [existing] = await db
    .select({
      id: feedbackSubmission.id,
      kind: feedbackSubmission.kind,
      email: user.email,
    })
    .from(feedbackSubmission)
    .innerJoin(user, eq(user.id, feedbackSubmission.userId))
    .where(eq(feedbackSubmission.id, id))
    .limit(1);

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Message not found' });
  }

  await db.delete(feedbackSubmission).where(eq(feedbackSubmission.id, id));

  enrichLog(event, {
    feedback: {
      id: existing.id,
      kind: existing.kind,
      user_email: existing.email,
    },
  });

  return { id: existing.id };
});
