/**
 * Timestamps are stored and sent as UTC. These formatters use the runtime's
 * timezone, so call them in the browser to get the viewer's device time.
 */
export function formatDateLabel(value: Date | string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

export function formatTimeLabel(value: Date | string) {
  return new Date(value).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Minutes to add to local time to get UTC, as returned by
 * Date#getTimezoneOffset. Only needed where the server groups rows by the
 * viewer's calendar day.
 */
export type TimezoneOffset = number | undefined;

export function isTimezoneOffset(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Math.abs(value) <= 14 * 60
  );
}

export function timezoneOffsetQuery() {
  return { tzOffset: new Date().getTimezoneOffset() };
}

export function resolveTimezoneOffset(timezoneOffset?: TimezoneOffset) {
  return isTimezoneOffset(timezoneOffset)
    ? timezoneOffset
    : new Date().getTimezoneOffset();
}

function viewerDay(value: Date, offsetMs: number) {
  const day = new Date(value.getTime() - offsetMs);
  day.setUTCHours(0, 0, 0, 0);
  const start = new Date(day.getTime() + offsetMs);
  return {
    key: day.toISOString().slice(0, 10),
    label: day.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }),
    start,
    end: new Date(start.getTime() + 86_400_000),
    time: day.getTime(),
  };
}

function withoutTime<T extends { time: number }>({ time: _time, ...day }: T) {
  return day;
}

/** The last `count` calendar days on the viewer's clock, oldest first. */
export function viewerRecentDays(
  count: number,
  timezoneOffset?: TimezoneOffset
) {
  const offsetMs = resolveTimezoneOffset(timezoneOffset) * 60_000;
  const today = viewerDay(new Date(), offsetMs);

  return Array.from({ length: count }, (_, index) => {
    const day = new Date(today.time);
    day.setUTCDate(day.getUTCDate() - (count - 1 - index));
    return withoutTime(viewerDay(new Date(day.getTime() + offsetMs), offsetMs));
  });
}

/**
 * Calendar days from `start` through `end` on the viewer's clock, oldest first.
 * A past event can be recorded after it ended, so the span covers both dates.
 */
export function viewerDaysBetween(
  start: Date,
  end: Date,
  timezoneOffset?: TimezoneOffset
) {
  const offsetMs = resolveTimezoneOffset(timezoneOffset) * 60_000;
  const first = viewerDay(start < end ? start : end, offsetMs);
  const last = viewerDay(start < end ? end : start, offsetMs);

  const days = [];
  for (let cursor = first.time; cursor <= last.time; cursor += 86_400_000) {
    days.push(withoutTime(viewerDay(new Date(cursor + offsetMs), offsetMs)));
  }
  return days;
}
