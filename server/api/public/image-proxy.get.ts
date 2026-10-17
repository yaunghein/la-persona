import { z } from 'zod';
import { UPLOAD_CONTENT_TYPES } from '~~/shared/contracts/media';

const ImageProxyQuery = z.object({
  url: z
    .string()
    .refine(isObjectStorageUrl, 'Only images from our storage can be proxied.'),
});

const PROXIED_CONTENT_TYPES = new Set<string>(UPLOAD_CONTENT_TYPES);

/**
 * Same-origin copy of a stored image, so canvas exports (wallpaper, vCard
 * photo) are not tainted by cross-origin data. Only our bucket, only rasters.
 */
export default defineEventHandler(async (event) => {
  const { url } = await parseRequestQuery(event, ImageProxyQuery);

  // Our bucket never redirects; refusing redirects keeps the fetch on the allowlisted host.
  const upstream = await fetch(url, { redirect: 'error' }).catch(() => null);
  if (!upstream?.ok || !upstream.body) {
    throw upstreamFailed('Could not load the image.');
  }

  const contentType = upstream.headers
    .get('content-type')
    ?.split(';')[0]
    ?.trim();
  if (!contentType || !PROXIED_CONTENT_TYPES.has(contentType)) {
    throw unsupportedMediaType('Only JPG, PNG and WebP images can be proxied.');
  }

  setResponseHeaders(event, {
    'content-type': contentType,
    'cache-control': 'public, max-age=300',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; sandbox",
  });
  return sendStream(event, upstream.body);
});
