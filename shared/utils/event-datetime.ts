import { format } from 'date-fns';

const TIME_VALUE_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_VALUE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isEventDateValue(value: string) {
  return DATE_VALUE_RE.test(value);
}

export function isEventTimeValue(value: string) {
  return TIME_VALUE_RE.test(value);
}

function asDate(value: Date | string) {
  return typeof value === 'string' ? new Date(value) : value;
}

/** Form date + time on the runtime's clock (the organizer's device) as a UTC instant. */
export function localDateTime(date: string, time: string) {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

// Formatters below use the runtime's timezone; call them in the browser.

export function formatEventDateLabel(startsAt: Date | string) {
  return format(asDate(startsAt), 'd MMM yyyy');
}

export function formatEventWeekdayDateLabel(startsAt: Date | string) {
  return format(asDate(startsAt), 'EEE, d MMM yyyy');
}

export function formatEventTimeValue(startsAt: Date | string) {
  return format(asDate(startsAt), 'HH:mm');
}

export function formatEventTimeLabel(startsAt: Date | string) {
  return format(asDate(startsAt), 'h:mm a');
}

export function formatEventDateTimeRange(
  startsAt: Date | string,
  endsAt: Date | string
) {
  return `${formatEventDateLabel(startsAt)}\n${formatEventTimeLabel(startsAt)} - ${formatEventTimeLabel(endsAt)}`;
}

export function formatEventDateValue(startsAt: Date | string) {
  return format(asDate(startsAt), 'yyyy-MM-dd');
}

export type EventPhase = 'before' | 'live' | 'past';

export type RegistrationBlock = 'past' | 'closed' | 'invite_only' | 'full';

export function eventPhase(
  startsAt: Date | string,
  endsAt: Date | string
): EventPhase {
  const now = Date.now();
  if (asDate(endsAt).getTime() < now) return 'past';
  if (asDate(startsAt).getTime() > now) return 'before';
  return 'live';
}

export function eventStatus(endsAt: Date | string): 'upcoming' | 'past' {
  return asDate(endsAt).getTime() >= Date.now() ? 'upcoming' : 'past';
}

export function eventScheduleError(
  startsAt: Date,
  endsAt: Date,
  options: { allowPast: boolean }
) {
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return null;
  }

  if (endsAt <= startsAt) return 'End time must be after start time';

  if (!options.allowPast && eventStatus(endsAt) === 'past') {
    return 'This event has already ended';
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

function timeOptionLabel(value: string) {
  const [hour = 0, minute = 0] = value.split(':').map(Number);
  const suffix = hour < 12 ? 'AM' : 'PM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/** Half-hour slots, plus any current values off the grid (e.g. an event created in another timezone). */
export function eventTimeOptions(currentValues: string[] = []) {
  const values = new Set<string>();

  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of [0, 30]) {
      values.add(
        `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      );
    }
  }
  for (const value of currentValues) {
    if (isEventTimeValue(value)) values.add(value);
  }

  return [...values]
    .sort()
    .map((value) => ({ label: timeOptionLabel(value), value }));
}
