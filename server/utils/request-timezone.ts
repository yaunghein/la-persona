import type { H3Event } from 'h3';
import { getQuery } from 'h3';
import { isTimezoneOffset } from '~~/shared/utils/event-datetime';

/** Browser timezone offset sent as `tzOffset`, so event times use the viewer's clock. */
export function requestTimezoneOffset(event: H3Event) {
  const raw = Number(getQuery(event).tzOffset);
  return isTimezoneOffset(raw) ? raw : undefined;
}
