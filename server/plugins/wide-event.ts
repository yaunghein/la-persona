import type { H3Event } from 'h3';
import { emitWideEvent, toLogError } from '~~/server/utils/wide-event';

function statusFromError(error: unknown) {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    if (typeof statusCode === 'number' && statusCode >= 400) return statusCode;
  }
  return 500;
}

export default defineNitroPlugin((nitroApp) => {
  // h3 skips afterResponse once the error handler has sent the body, so failures are emitted here.
  nitroApp.hooks.hook('error', (error, context) => {
    const event = (context as { event?: H3Event } | undefined)?.event;
    const wide = event?.context.wideEvent;
    if (!event || !wide) return;

    const status = statusFromError(error);
    wide.status_code = wide.status_code ?? status;
    wide.outcome = status >= 500 ? 'error' : 'client_error';
    if (!wide.error) wide.error = toLogError(error, status);
    emitWideEvent(event);
  });

  nitroApp.hooks.hook('afterResponse', (event) => {
    emitWideEvent(event);
  });
});
