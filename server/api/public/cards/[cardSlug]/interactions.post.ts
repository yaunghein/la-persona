import { findCardWithContextBySlug } from '~~/server/features/card/card.repository';
import { cardActivity } from '~~/server/features/card/card.service';
import { openAssignmentId } from '~~/server/features/organization/company.service';
import { insertCardInteraction } from '~~/server/features/analytics/card-interaction.repository';
import { RecordCardInteractionRequest } from '~~/shared/contracts/analytics';
import { CardRouteParams } from '~~/shared/contracts/card';

// One view per visitor per card per 10 minutes, so refreshes don't inflate views.
const VIEW_COOKIE_MAX_AGE = 60 * 10;

/** Anonymous card analytics (views, link clicks, saves). */
export default defineEventHandler(async (event) => {
  const { cardSlug } = await parseRouteParams(event, CardRouteParams);
  const request = await parseRequestBody(event, RecordCardInteractionRequest);

  const row = await findCardWithContextBySlug(cardSlug);
  if (!row) throw notFound('Card');
  if (cardActivity(row) !== 'ok') return respondNoContent(event);
  const { card } = row;

  const metadata = request.metadata ? { ...request.metadata } : undefined;
  if (metadata?.action === 'vcf_download' && metadata.photoHost) {
    enrichLog(event, {
      card: { id: card.id, slug: card.slug },
      vcf_photo: { host: metadata.photoHost },
    });
    delete metadata.photoHost;
  }

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
    cardAssignmentId: await openAssignmentId(card.id),
    type: request.type,
    metadata,
  });
  return respondNoContent(event);
});
