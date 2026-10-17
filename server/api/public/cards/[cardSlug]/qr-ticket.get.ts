import { findEmailQrBackgroundByCardSlug } from '~~/server/db/queries/community-setting';
import { env } from '~~/env';
import { renderQrTicketPng } from '~~/server/utils/qr-ticket-image';
import { enrichLog } from '~~/server/utils/wide-event';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

// Public so email clients can load it; it only ever encodes our own card URL.
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'cardSlug') ?? '';
  enrichLog(event, { card: { slug } });

  if (!SLUG_RE.test(slug)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid card slug.' });
  }

  const backgroundUrl = await findEmailQrBackgroundByCardSlug(slug);
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
