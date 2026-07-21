import { createAuthClient } from 'better-auth/vue';
import {
  magicLinkClient,
  adminClient,
  organizationClient,
  inferOrgAdditionalFields,
} from 'better-auth/client/plugins';
import {
  organizationAccessControl,
  organizationRoles,
} from '~~/shared/permissions/organization';

export const authClient = createAuthClient({
  plugins: [
    magicLinkClient(),
    adminClient(),
    organizationClient({
      ac: organizationAccessControl,
      roles: organizationRoles,
      schema: inferOrgAdditionalFields({
        organization: {
          additionalFields: {
            type: {
              type: 'string',
            },
            isPersonal: {
              type: 'boolean',
            },
          },
        },
      }),
    }),
  ],
});

type SocialProvider = 'google' | 'linkedin' | 'github';

function getAuthCallbackURL() {
  const route = useRoute();
  const redirectTo =
    typeof route.query.redirectTo === 'string'
      ? route.query.redirectTo
      : ROUTES.PLATFORM.ROOT;
  return `/platform?redirectTo=${redirectTo}`;
}

export const signInWithSocial = async (provider: SocialProvider) => {
  await authClient.signIn.social({
    provider,
    callbackURL: getAuthCallbackURL(),
  });
};

export const signInWithGoogle = async () => signInWithSocial('google');
export const signInWithLinkedIn = async () => signInWithSocial('linkedin');

export const signInWithMagicLink = async (email: string, name?: string) => {
  return await authClient.signIn.magicLink({
    email,
    name,
    callbackURL: getAuthCallbackURL(),
    errorCallbackURL: ROUTES.SIGN_IN,
  });
};

// Backward-compatible alias for existing usages.
export const signIn = signInWithGoogle;

export const signOut = async () => {
  const route = useRoute();
  await authClient.signOut({
    fetchOptions: {
      onSuccess: () => {
        navigateTo({
          path: ROUTES.SIGN_IN,
          query: {
            redirectTo: route.fullPath,
          },
        });
      },
    },
  });
};
