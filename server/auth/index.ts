import { betterAuth } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import { ensureUserHasFreeCard } from '../services/card';
import { env } from '../utils/env';
import type { User } from '../../shared/utils/type';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (!ctx.path.startsWith('/callback')) return;
      const session = ctx.context.newSession;
      if (!session) return;
      await ensureUserHasFreeCard(session.user as User);
    }),
  },
});
