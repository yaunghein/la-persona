import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { findCommunitySettingByOrganizationId } from '~~/server/features/organization/community-setting.repository';
import { event as eventTable } from '~~/server/db/schema';
import { env } from '~~/env';
import { ROUTES } from '~~/shared/utils/routes';

const yangonDate = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Yangon',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const yangonTime = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Yangon',
  hour: 'numeric',
  minute: 'numeric',
});

// "1:00 PM" → "1 PM"; keeps minutes when they matter.
function formatTime(date: Date) {
  return yangonTime.format(date).replace(':00', '');
}

/** "2:15 PM, 11 November 2026" in Yangon time. */
export function formatYangonDateTime(date: Date) {
  return `${yangonTime.format(date)}, ${yangonDate.format(date)}`;
}

/**
 * Event details and community artwork shared by every attendee email for one
 * event. Load once per send, then add per-recipient bits with the helpers below.
 */
export async function loadEventEmailContent(params: {
  eventId: string;
  organizationId: string;
}) {
  const [eventRow, setting] = await Promise.all([
    db.query.event.findFirst({
      where: eq(eventTable.id, params.eventId),
      columns: { location: true, mapUrl: true, startsAt: true, endsAt: true },
    }),
    findCommunitySettingByOrganizationId(params.organizationId),
  ]);
  if (!eventRow) return null;

  return {
    details: {
      eventDate: yangonDate.format(eventRow.startsAt),
      eventTime: `${formatTime(eventRow.startsAt)} - ${formatTime(eventRow.endsAt)}`,
      eventLocation: eventRow.location,
      directionsUrl:
        eventRow.mapUrl ||
        (eventRow.location
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(eventRow.location)}`
          : null),
      assetBaseUrl: env.BASE_URL,
    },
    images: {
      qrBackgroundUrl: setting?.emailQrBackgroundUrl || '',
      contactExchangeUrl: setting?.emailContactExchangeUrl || '',
      afterEventUrl: setting?.emailAfterEventUrl || '',
      // Busts the year-long QR image cache when the background changes.
      version: setting?.updatedAt.getTime() ?? 0,
    },
  };
}

export type EventEmailContent = NonNullable<
  Awaited<ReturnType<typeof loadEventEmailContent>>
>;

/** The value encoded in a card's QR, same as the wallpaper download. */
export function publicCardUrl(cardSlug: string) {
  return `${env.BASE_URL}/c/${cardSlug}`;
}

export function qrTicketImageUrl(cardSlug: string, version: number) {
  return `${env.BASE_URL}/api/public/cards/${cardSlug}/qr-ticket?v=${version}`;
}

export function cardContactInfoUrl(orgSlug: string, cardSlug: string) {
  return `${env.BASE_URL}${ROUTES.PLATFORM.ROOT}/${orgSlug}/cards/${cardSlug}`;
}

export function communityContactsUrl(orgSlug: string) {
  return `${env.BASE_URL}${ROUTES.PLATFORM.ROOT}/${orgSlug}/contacts`;
}

export function firstName(
  cardFirstName: string | null | undefined,
  accountName: string | null | undefined
) {
  return cardFirstName || accountName?.split(' ')[0] || 'there';
}
