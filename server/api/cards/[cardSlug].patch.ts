import { authorizeCardAccess } from '~~/server/features/card/card.policy';
import { updateCard } from '~~/server/features/card/card.service';
import { CardRouteParams, UpdateCardRequest } from '~~/shared/contracts/card';

export default defineEventHandler(async (event) => {
  const { cardSlug } = await parseRouteParams(event, CardRouteParams);
  const { card } = await authorizeCardAccess(event, cardSlug, 'card:update');
  const changes = await parseRequestBody(event, UpdateCardRequest);

  const updated = await updateCard(card, changes);
  if (updated.slug !== cardSlug)
    enrichLog(event, { card: { new_slug: updated.slug } });
  return updated;
});
