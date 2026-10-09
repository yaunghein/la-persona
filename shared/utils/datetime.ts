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

/** The last `count` calendar days on the viewer's clock, oldest first. */
export function viewerRecentDays(
  count: number,
  timezoneOffset?: TimezoneOffset
) {
  const offsetMs = resolveTimezoneOffset(timezoneOffset) * 60_000;
  const today = new Date(Date.now() - offsetMs);
  today.setUTCHours(0, 0, 0, 0);

  return Array.from({ length: count }, (_, index) => {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() - (count - 1 - index));
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
    };
  });
}
