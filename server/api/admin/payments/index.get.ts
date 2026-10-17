import { listPaymentsAwaitingReview } from '~~/server/features/billing/billing.service';
import { ListPaymentsQuery } from '~~/shared/contracts/billing';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'payment:read');
  const query = await parseRequestQuery(event, ListPaymentsQuery);
  return listPaymentsAwaitingReview(query);
});
