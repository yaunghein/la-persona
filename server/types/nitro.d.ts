import type { User, Session } from 'better-auth';

declare module 'h3' {
  interface H3EventContext {
    user: User | null;
    session: Session | null;
  }
}

export {};
