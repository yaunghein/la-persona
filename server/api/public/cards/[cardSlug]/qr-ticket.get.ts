import { findEmailQrBackgroundByCardSlug } from '~~/server/features/organization/community-setting.repository';
import { env } from '~~/env';
import { renderQrTicketPng } from '~~/server/lib/qr-ticket-renderer';
import { enrichLog } from '~~/server/utils/wide-event';
import { CardRouteParams } from '~~/shared/contracts/card';

// Public so email clients can load it; it only ever encodes our own card URL.
export default defineEventHandler(async (event) => {
  const { cardSlug: slug } = await parseRouteParams(event, CardRouteParams);
  enrichLog(event, { card: { slug } });

  const backgroundUrl = await findEmailQrBackgroundByCardSlug(slug);
  if (backgroundUrl === null) throw notFound('Card');

  const png = await renderQrTicketPng(
    `${env.BASE_URL}/c/${slug}`,
    backgroundUrl || undefined
  );

  // Email links carry ?v=<settings version>, so a new background gets a new URL.
  setResponseHeaders(event, {
    'Content-Type': 'image/png',
    'Cache-Control': 'public, max-age=31536000, immutable',
  });
  return png;
});
