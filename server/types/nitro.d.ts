import type { Principal } from '~~/server/utils/authorization';
import type { WideEvent } from '~~/server/utils/wide-event';

declare module 'h3' {
  interface H3EventContext {
    /** Set by `01.authentication` when the request carries a valid session. */
    principal?: Principal;
    wideEvent?: WideEvent;
    wideEventStartedAt?: number;
    wideEventEmitted?: boolean;
  }
}

export {};
