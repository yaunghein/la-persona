import { listCardHolders } from '~~/server/features/organization/company.service';
import { authorizeCardAccess } from '~~/server/features/card/card.policy';
import { CardRouteParams } from '~~/shared/contracts/card';

export default defineEventHandler(async (event) => {
  const { cardSlug } = await parseRouteParams(event, CardRouteParams);
  const access = await authorizeCardAccess(event, cardSlug, 'card:readAll');
  return listCardHolders(access.card.card.id);
});
