import { betterAuth } from 'better-auth';
import { magicLink, admin, organization } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import { env } from '../utils/env';
import {
  setupDefaultOrganization,
  getPersonalOrganizationByUserId,
} from '~~/server/services/auth';

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
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await setupDefaultOrganization(user);
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const organization = await getPersonalOrganizationByUserId(
            session.userId
          );
          return {
            data: {
              ...session,
              activeOrganizationId: organization?.id,
            },
          };
        },
      },
    },
  },
});
