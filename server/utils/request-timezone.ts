import type { H3Event } from 'h3';
import { getQuery } from 'h3';
import { sql, type SQLWrapper } from 'drizzle-orm';
import {
  isTimezoneOffset,
  resolveTimezoneOffset,
  type TimezoneOffset,
} from '~~/shared/utils/datetime';

/** Browser timezone offset sent as `tzOffset`, for grouping rows by the viewer's day. */
export function requestTimezoneOffset(event: H3Event) {
  const raw = Number(getQuery(event).tzOffset);
  return isTimezoneOffset(raw) ? raw : undefined;
}

/** `YYYY-MM-DD` of a UTC timestamp column on the viewer's calendar. */
export function viewerDaySql(
  column: SQLWrapper,
  timezoneOffset?: TimezoneOffset
) {
  const minutes = Math.round(resolveTimezoneOffset(timezoneOffset));
  return sql<string>`to_char(${column} - make_interval(mins => ${minutes}::int), 'YYYY-MM-DD')`;
}
