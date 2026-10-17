import type { H3Event } from 'h3';

/** 201 with `Location` pointing at the new resource; returns the representation. */
export function respondCreated<T>(
  event: H3Event,
  location: string,
  body: T
): T {
  setResponseStatus(event, 201);
  setResponseHeader(event, 'Location', location);
  return body;
}

/** 202 for work that continues after the response (emails, broadcasts). */
export function respondAccepted<T>(event: H3Event, body: T): T {
  setResponseStatus(event, 202);
  return body;
}

/** 204 with an empty body (deletes, idempotent updates with nothing to return). */
export function respondNoContent(event: H3Event): null {
  setResponseStatus(event, 204);
  return null;
}
