import { format } from 'date-fns';

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

export function eventStatus(
  endsAt: Date | string
): 'upcoming' | 'past' {
  const value = typeof endsAt === 'string' ? new Date(endsAt) : endsAt;
  return value.getTime() >= Date.now() ? 'upcoming' : 'past';
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
