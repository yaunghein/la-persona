import { betterAuth } from 'better-auth';
import { magicLink, admin, organization } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import { env } from '../utils/env';
import {
  organizationAccessControl,
  organizationRoles,
} from '~~/shared/permissions/organization';
import {
  setupDefaultOrganization,
  getPersonalOrganizationByUserId,
  getAnyOrganizationByUserId,
} from '~~/server/services/auth';
import { sendEmail } from '~~/server/utils/email';

const socialProviders: {
  github?: { clientId: string; clientSecret: string };
  google?: { clientId: string; clientSecret: string };
  linkedin?: { clientId: string; clientSecret: string };
} = {};

if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
  };
}

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  };
}

if (env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET) {
  socialProviders.linkedin = {
    clientId: env.LINKEDIN_CLIENT_ID,
    clientSecret: env.LINKEDIN_CLIENT_SECRET,
  };
}

function getFallbackAvatarUrl(email: string) {
  return `https://avatar.vercel.sh/${encodeURIComponent(email)}`;
}

function getFallbackNameFromEmail(email: string) {
  const localPart = email.split('@')[0]?.trim();
  return localPart || 'User';
}

export const auth = betterAuth({
  baseURL: env.BASE_URL,
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  socialProviders,
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, token, url }, _ctx) => {
        await sendEmail({
          to: [email],
          subject: 'Your LA PERSONA magic sign-in link',
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111111;">
              <h2 style="margin: 0 0 12px;">Sign in to LA PERSONA</h2>
              <p style="margin: 0 0 16px;">
                Click the button below to continue. This link expires soon for your security.
              </p>
              <a
                href="${url}"
                style="
                  display: inline-block;
                  padding: 10px 18px;
                  border-radius: 9999px;
                  background: #111111;
                  color: #ffffff;
                  text-decoration: none;
                  font-weight: 600;
                "
              >
                Sign in with Magic Link
              </a>
              <p style="margin: 16px 0 0; font-size: 12px; color: #6b7280;">
                If the button does not work, paste this URL in your browser:
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; word-break: break-all; color: #6b7280;">
                ${url}
              </p>
              <p style="margin: 16px 0 0; font-size: 11px; color: #9ca3af;">
                Token: ${token}
              </p>
            </div>
          `,
        });
      },
    }),
    admin(),
    organization({
      ac: organizationAccessControl,
      roles: organizationRoles,
      schema: {
        organization: {
          additionalFields: {
            type: {
              type: 'string',
              required: true,
              defaultValue: 'personal',
              input: true,
            },
            isPersonal: {
              type: 'boolean',
              required: true,
              defaultValue: false,
              input: false,
            },
          },
        },
      },
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const hasImage = Boolean(user.image?.trim());
          const hasName = Boolean(user.name?.trim());

          return {
            data: {
              ...user,
              image: hasImage ? user.image : getFallbackAvatarUrl(user.email),
              name: hasName ? user.name : getFallbackNameFromEmail(user.email),
            },
          };
        },
        after: async (user) => {
          await setupDefaultOrganization(user);
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const organization =
            (await getPersonalOrganizationByUserId(session.userId)) ||
            (await getAnyOrganizationByUserId(session.userId));
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
