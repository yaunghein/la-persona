import { listFeedbackForReview } from '~~/server/features/feedback/feedback.service';
import { ListFeedbackQuery } from '~~/shared/contracts/feedback';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'feedback:read');
  const query = await parseRequestQuery(event, ListFeedbackQuery);
  return listFeedbackForReview(query);
});
