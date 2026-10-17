import { toCardDetail } from '~~/server/features/card/card.mapper';
import { authorizeCardAccess } from '~~/server/features/card/card.policy';
import { CardRouteParams } from '~~/shared/contracts/card';

export default defineEventHandler(async (event) => {
  const { cardSlug } = await parseRouteParams(event, CardRouteParams);
  const { card } = await authorizeCardAccess(event, cardSlug, 'card:read');
  return toCardDetail(card);
});
