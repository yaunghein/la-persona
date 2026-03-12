import { env } from '~~/server/utils/env';

export default defineEventHandler(async (event) => {
  const { url } = getQuery(event);
  if (typeof url !== 'string' || !url) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing image URL',
    });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid image URL',
    });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Unsupported URL protocol',
    });
  }

  const allowedHosts = new Set([
    `${env.AWS_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com`,
    `${env.AWS_BUCKET_NAME}.s3.amazonaws.com`,
  ]);

  if (!allowedHosts.has(parsedUrl.host)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Image host is not allowed',
    });
  }

  const upstream = await fetch(parsedUrl.toString());
  if (!upstream.ok || !upstream.body) {
    throw createError({
      statusCode: upstream.status || 502,
      statusMessage: 'Failed to fetch image',
    });
  }

  setResponseHeader(
    event,
    'content-type',
    upstream.headers.get('content-type') || 'application/octet-stream'
  );
  setResponseHeader(event, 'cache-control', 'public, max-age=300');

  return sendStream(event, upstream.body);
});
