import { betterAuth } from 'better-auth';
import { magicLink, admin, organization } from 'better-auth/plugins';
import { createAuthMiddleware } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import { ensureUserHasFreeCard } from '../services/card';
import { env } from '../utils/env';

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
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, token, url }, ctx) => {
        // send email to user
      },
    }),
    admin(),
    organization(),
  ],
  // hooks: {
  //   after: createAuthMiddleware(async (ctx) => {
  //     if (!ctx.path.startsWith('/callback')) return;
  //     const session = ctx.context.newSession;
  //     if (!session) return;
  //     await ensureUserHasFreeCard(session.user as User); // ensureUserHasStandardCard
  //   }),
  // },
});
