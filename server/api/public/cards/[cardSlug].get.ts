import { findCardWithContextBySlug } from '~~/server/features/card/card.repository';
import { toPublicCard } from '~~/server/features/card/card.mapper';
import { CardRouteParams } from '~~/shared/contracts/card';

export default defineEventHandler(async (event) => {
  const { cardSlug } = await parseRouteParams(event, CardRouteParams);
  const card = await findCardWithContextBySlug(cardSlug);
  if (!card) throw notFound('Card');
  if (card.card.visibility === 'members' && !event.context.principal)
    throw unauthorized('Sign in to view this card.');
  return toPublicCard(card);
});
