import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import { feedbackSubmission } from '~~/server/db/schema';
import { handleApiError } from '~~/server/utils/errors';
import { feedbackSubmissionInsertSchema } from '~~/shared/types/feedback';

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  const body = await readValidatedBody(
    event,
    feedbackSubmissionInsertSchema.safeParse
  );
  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: body.error.issues,
    });
  }

  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No active organization selected.',
    });
  }

  try {
    const [inserted] = await db
      .insert(feedbackSubmission)
      .values({
        kind: body.data.kind,
        message: body.data.message,
        organizationId,
        userId: session.user.id,
      })
      .returning();

    return inserted;
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to submit feedback',
    });
  }
});
