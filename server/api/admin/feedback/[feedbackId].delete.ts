import { removeFeedback } from '~~/server/features/feedback/feedback.service';
import { FeedbackRouteParams } from '~~/shared/contracts/feedback';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'feedback:delete');
  const { feedbackId } = await parseRouteParams(event, FeedbackRouteParams);
  const deleted = await removeFeedback(feedbackId);
  enrichLog(event, {
    feedback: { id: deleted.id, kind: deleted.kind, user_id: deleted.userId },
  });
  return respondNoContent(event);
});
