import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { feedbackSubmission, organization } from '~~/server/db/schema';
import { notifyFeedbackSubmissionEmail } from '~~/server/utils/feedback-email-notifications';
import { handleApiError } from '~~/server/utils/errors';
import { getAdminNotificationEmails } from '~~/server/utils/env';
import {
  emailErrorLabel,
  enrichLog,
  trackEmailSends,
} from '~~/server/utils/wide-event';
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

    const submitterEmail = session.user.email?.trim() || '';
    enrichLog(event, {
      feedback: {
        kind: body.data.kind,
        ...(submitterEmail ? { submitter_email: submitterEmail } : {}),
      },
    });
    if (submitterEmail) {
      try {
        const org = await db.query.organization.findFirst({
          where: eq(organization.id, organizationId),
          columns: { name: true },
        });
        const recipients = getAdminNotificationEmails();
        if (recipients.length > 0) {
          enrichLog(event, {
            email: {
              attempted: true,
              template: 'feedback_team',
              to: recipients,
            },
          });
        }
        trackEmailSends(
          event,
          notifyFeedbackSubmissionEmail({
            kind: body.data.kind,
            message: body.data.message,
            submitterName: session.user.name?.trim() || submitterEmail,
            submitterEmail,
            organizationName: org?.name || 'Unknown organization',
          })
        );
      } catch (error) {
        enrichLog(event, {
          email: {
            attempted: true,
            template: 'feedback_team',
            ok: false,
            error: emailErrorLabel(error),
          },
        });
      }
    }

    return inserted;
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to submit feedback',
    });
  }
});
