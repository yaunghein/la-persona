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

export function eventPlaceholderUrl(index: number) {
  return EVENT_PLACEHOLDER_URLS[index % EVENT_PLACEHOLDER_URLS.length]!;
}

export function toRemoteEventMediaItem(url: string): EventMediaItem {
  return {
    id: crypto.randomUUID(),
    previewUrl: url,
    source: 'remote',
  };
}

export function eventImageUpdatePayload(
  cover: EventMediaItem | null,
  photos: EventMediaItem[]
) {
  return {
    coverChanged: cover?.source === 'local',
    keptPhotoUrls: photos
      .filter((item) => item.source === 'remote')
      .map((item) => item.previewUrl),
    newPhotoCount: photos.filter((item) => item.source === 'local').length,
  };
}

export function nextEventPlaceholderUrl(exclude: string[] = []) {
  return (
    EVENT_PLACEHOLDER_URLS.find((url) => !exclude.includes(url)) ??
    eventPlaceholderUrl(0)
  );
}

export function mimicEventImageUrls(extraPhotoCount: number) {
  const count = Math.min(
    Math.max(extraPhotoCount, 0),
    EVENT_MAX_EXTRA_PHOTOS
  );

  return {
    coverUrl: eventPlaceholderUrl(0),
    photoUrls: Array.from({ length: count }, (_, index) =>
      eventPlaceholderUrl(index + 1)
    ),
  };
}

export function resolveUpdatedEventImageUrls(input: {
  existingCoverUrl: string;
  coverChanged: boolean;
  keptPhotoUrls: string[];
  newPhotoCount: number;
}) {
  const coverUrl = input.coverChanged
    ? nextEventPlaceholderUrl([input.existingCoverUrl])
    : input.existingCoverUrl;

  const extraCount = Math.min(
    input.keptPhotoUrls.length + input.newPhotoCount,
    EVENT_MAX_EXTRA_PHOTOS
  );
  const newCount = Math.max(extraCount - input.keptPhotoUrls.length, 0);

  return {
    coverUrl,
    photoUrls: [
      ...input.keptPhotoUrls,
      ...Array.from({ length: newCount }, (_, index) =>
        eventPlaceholderUrl(input.keptPhotoUrls.length + index + 1)
      ),
    ],
  };
}
