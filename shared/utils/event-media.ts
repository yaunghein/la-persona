import { isObjectStorageUrl } from '~~/shared/utils/object-storage';

export const EVENT_PLACEHOLDER_URLS = [
  '/images/event-placeholder-1.jpg',
  '/images/event-placeholder-2.jpg',
  '/images/event-placeholder-3.jpg',
] as const;

export const EVENT_MAX_EXTRA_PHOTOS = 4;
export const EVENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const EVENT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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

export function isAllowedEventImageUrl(url: string) {
  const value = url.trim();
  if ((EVENT_PLACEHOLDER_URLS as readonly string[]).includes(value)) {
    return true;
  }
  return isObjectStorageUrl(value);
}
