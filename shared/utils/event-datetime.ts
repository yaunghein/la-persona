import { format } from 'date-fns';
import { getCookie } from 'h3';
import { useRequestEvent, useState } from '#imports';

const TIME_VALUE_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_VALUE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isEventDateValue(value: string) {
  return DATE_VALUE_RE.test(value);
}

export function isEventTimeValue(value: string) {
  return TIME_VALUE_RE.test(value);
}

export function wallClockDate(date: string, time: string) {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
}

export function formatEventDateLabel(startsAt: Date | string) {
  const value = typeof startsAt === 'string' ? new Date(startsAt) : startsAt;
  return format(
    new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    'd MMM yyyy'
  );
}

export function formatEventWeekdayDateLabel(startsAt: Date | string) {
  const value = typeof startsAt === 'string' ? new Date(startsAt) : startsAt;
  return format(
    new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    'EEE, d MMM yyyy'
  );
}

export function formatEventTimeValue(startsAt: Date | string) {
  const value = typeof startsAt === 'string' ? new Date(startsAt) : startsAt;
  const hours = String(value.getUTCHours()).padStart(2, '0');
  const minutes = String(value.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatEventTimeLabel(startsAt: Date | string) {
  const value = typeof startsAt === 'string' ? new Date(startsAt) : startsAt;
  const hours = value.getUTCHours();
  const minutes = String(value.getUTCMinutes()).padStart(2, '0');
  const suffix = hours < 12 ? 'AM' : 'PM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${suffix}`;
}

export function formatEventDateTimeRange(
  startsAt: Date | string,
  endsAt: Date | string
) {
  return `${formatEventDateLabel(startsAt)}\n${formatEventTimeLabel(startsAt)} - ${formatEventTimeLabel(endsAt)}`;
}

export function formatEventDateValue(startsAt: Date | string) {
  const value = typeof startsAt === 'string' ? new Date(startsAt) : startsAt;
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const EVENT_TIMEZONE_OFFSET_COOKIE = 'tz_offset';

export type EventPhase = 'before' | 'live' | 'past';

export type RegistrationBlock = 'past' | 'closed' | 'invite_only' | 'full';

function asDate(value: Date | string) {
  return typeof value === 'string' ? new Date(value) : value;
}

/** Stored event times are the wall clock the organizer typed, saved as UTC. */
export function eventInstant(value: Date | string) {
  return asDate(value).getTime();
}

function isTimezoneOffset(value: number) {
  return Number.isFinite(value) && Math.abs(value) <= 14 * 60;
}

function readRequestTimezoneOffset() {
  try {
    const request = useRequestEvent();
    if (!request) return null;
    const parsed = Number(getCookie(request, EVENT_TIMEZONE_OFFSET_COOKIE));
    return isTimezoneOffset(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Minutes to add to local time to get UTC, matching Date#getTimezoneOffset.
 * In the browser this is the viewer's zone. On the server it is the tz_offset
 * cookie from that browser, so the page and the API use the same clock.
 */
export function currentTimezoneOffset() {
  const fallback = new Date().getTimezoneOffset();
  try {
    const pinned = useState<number | null>('event-tz-offset', () => null);
    if (pinned.value == null) {
      pinned.value = readRequestTimezoneOffset() ?? fallback;
    }
    return pinned.value;
  } catch {
    return readRequestTimezoneOffset() ?? fallback;
  }
}

function localNowMs() {
  return Date.now() - currentTimezoneOffset() * 60_000;
}

export function eventPhase(
  startsAt: Date | string,
  endsAt: Date | string
): EventPhase {
  const now = localNowMs();
  if (eventInstant(endsAt) < now) return 'past';
  if (eventInstant(startsAt) > now) return 'before';
  return 'live';
}

export function eventStatus(endsAt: Date | string): 'upcoming' | 'past' {
  return eventInstant(endsAt) >= localNowMs() ? 'upcoming' : 'past';
}

export function eventScheduleError(
  date: string,
  startTime: string,
  endTime: string,
  options: { allowPast: boolean }
) {
  if (
    !isEventDateValue(date) ||
    !isEventTimeValue(startTime) ||
    !isEventTimeValue(endTime)
  ) {
    return null;
  }

  if (endTime <= startTime) {
    return {
      path: 'endTime' as const,
      message: 'End time must be after start time',
    };
  }

  if (
    !options.allowPast &&
    eventStatus(wallClockDate(date, endTime)) === 'past'
  ) {
    return {
      path: 'endTime' as const,
      message: 'This event has already ended',
    };
  }

  return null;
}

export function registrationBlockReason(input: {
  startsAt: Date | string;
  endsAt: Date | string;
  registrationMode: 'open' | 'closed' | 'invite_only';
  capacity: number | null;
  registeredCount: number;
}): RegistrationBlock | null {
  if (eventStatus(input.endsAt) === 'past') return 'past';
  if (input.registrationMode === 'closed') return 'closed';
  if (input.registrationMode === 'invite_only') return 'invite_only';
  if (input.capacity != null && input.registeredCount >= input.capacity) {
    return 'full';
  }
  return null;
}

export function registrationBlockMessage(reason: RegistrationBlock) {
  switch (reason) {
    case 'past':
      return 'This event has ended';
    case 'closed':
      return 'Registration is closed for this event';
    case 'invite_only':
      return 'This event is invite only';
    case 'full':
      return 'This event is at capacity';
  }
}

export function spotsRemaining(
  capacity: number | null,
  registeredCount: number
) {
  if (capacity == null) return null;
  return Math.max(capacity - registeredCount, 0);
}

export function eventTimeOptions() {
  const options: { label: string; value: string }[] = [];

  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of [0, 30]) {
      const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      const suffix = hour < 12 ? 'AM' : 'PM';
      const hour12 = hour % 12 === 0 ? 12 : hour % 12;
      const label = `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
      options.push({ label, value });
    }
  }

  return options;
}
