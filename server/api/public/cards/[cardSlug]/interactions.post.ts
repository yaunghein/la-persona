import { findCardBySlug } from '~~/server/features/card/card.repository';
import { insertCardInteraction } from '~~/server/features/analytics/card-interaction.repository';
import { RecordCardInteractionRequest } from '~~/shared/contracts/analytics';
import { CardRouteParams } from '~~/shared/contracts/card';

// One view per visitor per card per 10 minutes, so refreshes don't inflate views.
const VIEW_COOKIE_MAX_AGE = 60 * 10;

/** Anonymous card analytics (views, link clicks, saves). */
export default defineEventHandler(async (event) => {
  const { cardSlug } = await parseRouteParams(event, CardRouteParams);
  const request = await parseRequestBody(event, RecordCardInteractionRequest);

  const card = await findCardBySlug(cardSlug);
  if (!card) throw notFound('Card');

  // The owner looking at their own card isn't engagement.
  if (event.context.principal?.user.id === card.userId)
    return respondNoContent(event);

  if (request.type === 'view') {
    const cookieName = `lp_viewed_${card.id}`;
    if (getCookie(event, cookieName)) return respondNoContent(event);
    setCookie(event, cookieName, '1', {
      httpOnly: true,
      secure: !import.meta.dev,
      sameSite: 'lax',
      path: '/',
      maxAge: VIEW_COOKIE_MAX_AGE,
    });
  }

  await insertCardInteraction({
    cardId: card.id,
    organizationId: card.organizationId,
    userId: card.userId,
    type: request.type,
    metadata: request.metadata,
  });
  return respondNoContent(event);
});
