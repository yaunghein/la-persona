import { submitFeedback } from '~~/server/features/feedback/feedback.service';
import { CreateFeedbackRequest } from '~~/shared/contracts/feedback';
import { OrganizationRouteParams } from '~~/shared/contracts/organization';

export default defineEventHandler(async (event) => {
  const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
  const { organization, principal } = await authorizeOrganizationAccess(
    event,
    orgSlug
  );
  const request = await parseRequestBody(event, CreateFeedbackRequest);

  const result = await submitFeedback({
    request,
    organization,
    submitter: {
      userId: principal.user.id,
      name: principal.user.name,
      email: principal.user.email,
    },
  });
  enrichLog(event, {
    feedback: {
      id: result.feedbackId,
      kind: request.kind,
      submitter_email: principal.user.email,
    },
    ...(result.emails
      ? {
          email: {
            attempted: true,
            template: 'feedback_team',
            to: result.recipients,
          },
        }
      : {}),
  });
  if (result.emails) trackEmailSends(event, result.emails);
  return respondCreated(event, `/api/admin/feedback/${result.feedbackId}`, {
    id: result.feedbackId,
  });
});
