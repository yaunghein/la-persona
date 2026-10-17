import type { H3Event } from 'h3';

/** True when the client explicitly asks for CSV (`Accept: text/csv`). */
export function prefersCsv(event: H3Event): boolean {
  return (getRequestHeader(event, 'accept') ?? '').includes('text/csv');
}

/** Sends a CSV attachment. */
export function respondCsv(event: H3Event, fileName: string, csv: string) {
  setResponseHeaders(event, {
    'content-type': 'text/csv; charset=utf-8',
    'content-disposition': `attachment; filename="${fileName.replace(/[^\w.-]/g, '_')}"`,
    'cache-control': 'no-store',
  });
  return csv;
}
