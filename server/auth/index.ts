import { betterAuth } from 'better-auth';
import { magicLink, admin, organization } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api';
import { db } from '../db';
import { env } from '~~/env';
import {
  organizationAccessControl,
  organizationRoles,
} from '~~/shared/permissions/organization';
import {
  platformAccessControl,
  platformRoles,
} from '~~/shared/permissions/platform';
import {
  findAnyOrganization,
  findPersonalOrganization,
  provisionPersonalOrganization,
} from '~~/server/features/auth/account.service';
import { sendEmail } from '~~/server/lib/mailer';
import { ROUTES } from '~~/shared/utils/routes';

const socialProviders: {
  github?: { clientId: string; clientSecret: string };
  google?: {
    clientId: string;
    clientSecret: string;
    accessType: 'offline';
  };
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
    // Google Calendar sync needs a refresh token; access tokens expire after an hour.
    accessType: 'offline',
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
      expiresIn: 60 * 30,
      sendMagicLink: async ({ email, url }, _ctx) => {
        await sendEmail({
          to: [email],
          subject: 'Your LA PERSONA magic sign-in link',
          html: await renderEmailComponent('MagicLink', { url }),
        });
      },
    }),
    admin({
      ac: platformAccessControl,
      roles: platformRoles,
    }),
    organization({
      ac: organizationAccessControl,
      roles: organizationRoles,
      // Organizations are provisioned by the app (personal on sign-up, communities by Thakhin).
      allowUserToCreateOrganization: false,
      organizationHooks: {
        // Ownership is only ever assigned at creation; never through a role change.
        beforeUpdateMemberRole: async ({ newRole }) => {
          if (newRole.split(',').includes('owner')) {
            throw new APIError('FORBIDDEN', {
              message: 'Ownership cannot be granted by a role change.',
            });
          }
        },
      },
      schema: {
        organization: {
          additionalFields: {
            type: {
              type: 'string',
              required: true,
              defaultValue: 'personal',
              input: false,
            },
          },
        },
      },
      sendInvitationEmail: async ({
        email,
        id,
        role,
        organization: invitedOrg,
        inviter,
      }) => {
        const isVolunteer = role === 'volunteer';
        await sendEmail({
          to: [email],
          subject: isVolunteer
            ? `You're invited to volunteer with ${invitedOrg.name} on LA PERSONA`
            : `You're invited to join ${invitedOrg.name} on LA PERSONA`,
          html: await renderEmailComponent(
            isVolunteer
              ? 'CommunityVolunteerInvitation'
              : 'CommunityInvitation',
            {
              inviterName: inviter.user.name || 'A community organizer',
              organizationName: invitedOrg.name,
              inviteUrl: `${env.BASE_URL}${ROUTES.INVITE.COMMUNITY_ACCEPT(id, email)}`,
            }
          ),
        });
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
          await provisionPersonalOrganization(user);
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const organization =
            (await findPersonalOrganization(session.userId)) ||
            (await findAnyOrganization(session.userId));
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
