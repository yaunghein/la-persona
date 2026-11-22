import { listCardPeriods } from '~~/server/features/billing/card-period.service';
import { AdminCardRouteParams } from '~~/shared/contracts/card';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'card:read');
  const { cardId } = await parseRouteParams(event, AdminCardRouteParams);
  enrichLog(event, { card: { id: cardId } });
  return listCardPeriods(cardId);
});
