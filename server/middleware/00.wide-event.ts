import { getRequestHeader, setResponseHeader } from 'h3';

export default defineEventHandler((event) => {
  const path = (event.path || '').split('?')[0] || '';
  if (!path.startsWith('/api')) return;

  const incoming = getRequestHeader(event, 'x-request-id');
  const requestId =
    incoming && incoming.length <= 200 && !/[\r\n]/.test(incoming)
      ? incoming
      : crypto.randomUUID();

  event.context.wideEvent = {
    request_id: requestId,
    method: event.method,
    route: path,
  };
  event.context.wideEventStartedAt = Date.now();
  setResponseHeader(event, 'x-request-id', requestId);
});
