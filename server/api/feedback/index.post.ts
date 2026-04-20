import { db } from '~~/server/db';
import { feedbackSubmission } from '~~/server/db/schema';
import { handleApiError } from '~~/server/utils/errors';
import { requireOrganizationSession } from '~~/server/utils/organization-permissions';
import { feedbackSubmissionInsertSchema } from '~~/shared/types/feedback';

export default defineEventHandler(async (event) => {
  const session = await requireOrganizationSession(event);

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
