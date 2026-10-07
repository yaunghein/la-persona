import type { User, Session } from 'better-auth';
import type { WideEvent } from '~~/server/utils/wide-event';

declare module 'h3' {
  interface H3EventContext {
    user: User | null;
    session: Session | null;
    wideEvent?: WideEvent;
    wideEventStartedAt?: number;
    wideEventEmitted?: boolean;
  }
}

export {};
