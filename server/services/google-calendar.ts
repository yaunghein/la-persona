import { createHash } from 'node:crypto';
import type { H3Event } from 'h3';
import { auth } from '~~/server/auth';
import { env } from '~~/server/utils/env';
import type { SelectEvent } from '~~/shared/types/event';
import { GOOGLE_CALENDAR_SCOPE } from '~~/shared/constants/google-calendar';
import { ROUTES } from '~~/shared/utils/routes';

const CALENDAR_EVENTS_URL =
  'https://www.googleapis.com/calendar/v3/calendars/primary/events';

type GoogleCalendarEvent = { id: string; htmlLink?: string };

type GoogleApiErrorBody = {
  error?: { errors?: { reason?: string }[] };
};

export class GoogleCalendarConsentRequiredError extends Error {}

export class GoogleCalendarApiError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string | undefined
  ) {
    super(
      `Google Calendar request failed (${status}${reason ? `: ${reason}` : ''})`
    );
  }
}

/** Returns null when the user has no Google account or hasn't granted the calendar scope. */
export async function getGoogleCalendarAccessToken(
  event: H3Event,
  userId: string
) {
  try {
    const tokens = await auth.api.getAccessToken({
      body: { providerId: 'google', userId },
      headers: event.headers,
    });
    if (!tokens.accessToken) return null;
    if (!tokens.scopes.includes(GOOGLE_CALENDAR_SCOPE)) return null;
    return tokens.accessToken;
  } catch {
    return null;
  }
}

// Google event ids must be base32hex (0-9, a-v); sha256 hex fits and keeps one entry per registration.
function googleEventId(userId: string, eventId: string) {
  return createHash('sha256')
    .update(`la-persona:${userId}:${eventId}`)
    .digest('hex');
}

function toGoogleEventBody(row: SelectEvent) {
  const eventUrl = `${env.BASE_URL}${ROUTES.EVENTS.PUBLIC(row.id)}`;
  const link = `<a href="${eventUrl}">View event on LA PERSONA</a>`;

  return {
    summary: row.title,
    description: row.description ? `${row.description}<br>${link}` : link,
    location: row.location,
    start: { dateTime: row.startsAt.toISOString() },
    end: { dateTime: row.endsAt.toISOString() },
    source: { title: 'LA PERSONA', url: eventUrl },
    status: 'confirmed',
  };
}

async function calendarRequest(
  accessToken: string,
  url: string,
  method: 'POST' | 'PATCH',
  body: Record<string, unknown>
) {
  const response = await $fetch.raw<GoogleCalendarEvent & GoogleApiErrorBody>(
    url,
    {
      method,
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
      ignoreResponseError: true,
    }
  );
  if (response.ok) return response;

  const reason = response._data?.error?.errors?.[0]?.reason;
  // Other 403s (API disabled, rate limits) are not fixed by asking the user again.
  if (
    response.status === 401 ||
    (response.status === 403 && reason === 'insufficientPermissions')
  ) {
    throw new GoogleCalendarConsentRequiredError();
  }

  return response;
}

function apiError(response: { status: number; _data?: GoogleApiErrorBody }) {
  return new GoogleCalendarApiError(
    response.status,
    response._data?.error?.errors?.[0]?.reason
  );
}

export async function upsertGoogleCalendarEvent(
  accessToken: string,
  userId: string,
  row: SelectEvent
) {
  const id = googleEventId(userId, row.id);
  const body = toGoogleEventBody(row);

  const inserted = await calendarRequest(
    accessToken,
    CALENDAR_EVENTS_URL,
    'POST',
    { id, ...body }
  );
  if (inserted.ok) {
    return { result: 'added' as const, htmlLink: inserted._data?.htmlLink };
  }

  // 409: already added before (possibly deleted by the user, which Google keeps as cancelled).
  if (inserted.status !== 409) throw apiError(inserted);

  const updated = await calendarRequest(
    accessToken,
    `${CALENDAR_EVENTS_URL}/${id}`,
    'PATCH',
    body
  );
  if (!updated.ok) throw apiError(updated);

  return { result: 'updated' as const, htmlLink: updated._data?.htmlLink };
}
