import { findCardBySlug } from '~~/server/features/card/card.repository';
import { insertCardInteraction } from '~~/server/features/analytics/card-interaction.repository';
import { RecordCardInteractionRequest } from '~~/shared/contracts/analytics';
import { CardRouteParams } from '~~/shared/contracts/card';

/** Anonymous card analytics (views, link clicks, saves). */
export default defineEventHandler(async (event) => {
  const { cardSlug } = await parseRouteParams(event, CardRouteParams);
  const request = await parseRequestBody(event, RecordCardInteractionRequest);

  const card = await findCardBySlug(cardSlug);
  if (!card) throw notFound('Card');

  await insertCardInteraction({
    cardId: card.id,
    organizationId: card.organizationId,
    userId: card.userId,
    type: request.type,
    metadata: request.metadata,
  });
  return respondNoContent(event);
});
