import type { H3Event } from 'h3';
import { emitWideEvent, toLogError } from '~~/server/utils/wide-event';

export default defineNitroPlugin((nitroApp) => {
  // h3 skips afterResponse once the error handler has sent the body, so failures are emitted here.
  nitroApp.hooks.hook('error', (error, context) => {
    const event = (context as { event?: H3Event } | undefined)?.event;
    const wide = event?.context.wideEvent;
    if (!event || !wide) return;

    const statusCode = (error as { statusCode?: unknown } | null)?.statusCode;
    const status =
      typeof statusCode === 'number' && statusCode >= 400 ? statusCode : 500;
    wide.status_code = wide.status_code ?? status;
    wide.outcome = status >= 500 ? 'error' : 'client_error';
    if (!wide.error) wide.error = toLogError(error, status);
    emitWideEvent(event);
  });

  nitroApp.hooks.hook('afterResponse', (event) => {
    emitWideEvent(event);
  });
});
