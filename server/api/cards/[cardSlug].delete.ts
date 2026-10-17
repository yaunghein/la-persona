import { authorizeCardAccess } from '~~/server/features/card/card.policy';
import { deleteCard } from '~~/server/features/card/card.service';
import { CardRouteParams } from '~~/shared/contracts/card';

export default defineEventHandler(async (event) => {
  const { cardSlug } = await parseRouteParams(event, CardRouteParams);
  const { card, principal } = await authorizeCardAccess(
    event,
    cardSlug,
    'card:delete'
  );
  await deleteCard(card, principal.user.id);
  return respondNoContent(event);
});
