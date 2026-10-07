export const EVENT_PLACEHOLDER_URLS = [
  '/images/event-placeholder-1.jpg',
  '/images/event-placeholder-2.jpg',
  '/images/event-placeholder-3.jpg',
] as const;

export const EVENT_MAX_EXTRA_PHOTOS = 4;
export const EVENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export type EventMediaSource = 'local' | 'remote';

export type EventMediaItem = {
  id: string;
  previewUrl: string;
  source: EventMediaSource;
};

export function toRemoteEventMediaItem(url: string): EventMediaItem {
  return {
    id: crypto.randomUUID(),
    previewUrl: url,
    source: 'remote',
  };
}

export function eventGalleryImages(
  coverUrl?: string | null,
  photoUrls?: string[] | null
) {
  const cover = String(coverUrl || '').trim();
  const extras = (photoUrls ?? [])
    .map((url) => String(url || '').trim())
    .filter(Boolean);

  return cover ? [cover, ...extras] : extras;
}

export function isAllowedEventImageUrl(
  url: string,
  host: { bucket: string; region: string }
) {
  const value = url.trim();
  if ((EVENT_PLACEHOLDER_URLS as readonly string[]).includes(value)) {
    return true;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') return false;

  const bucket = host.bucket.trim();
  const region = host.region.trim();
  if (!bucket || !region) return false;

  const allowedHosts = new Set([
    `${bucket}.s3.${region}.amazonaws.com`,
    `${bucket}.s3.amazonaws.com`,
  ]);

  return allowedHosts.has(parsed.host);
}
