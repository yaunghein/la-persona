import { createAuthClient } from 'better-auth/vue';
import {
  magicLinkClient,
  adminClient,
  organizationClient,
} from 'better-auth/client/plugins';
import {
  organizationAccessControl,
  organizationRoles,
} from '~~/shared/permissions/organization';
import { getSafeInternalPath } from '~~/shared/utils/safe-redirect';

export const authClient = createAuthClient({
  plugins: [
    magicLinkClient(),
    adminClient(),
    organizationClient({
      ac: organizationAccessControl,
      roles: organizationRoles,
    }),
  ],
});

type SocialProvider = 'google' | 'linkedin' | 'github';

function getAuthRedirectTo() {
  return (
    getSafeInternalPath(useRoute().query.redirectTo, ROUTES.PLATFORM.ROOT) ||
    ROUTES.PLATFORM.ROOT
  );
}

function getAuthCallbackURL() {
  return getAuthRedirectTo();
}

function getAuthErrorCallbackURL() {
  const redirectTo = getAuthRedirectTo();
  if (redirectTo === ROUTES.PLATFORM.ROOT) {
    return ROUTES.SIGN_IN;
  }

  return `${ROUTES.SIGN_IN}?redirectTo=${redirectTo}`;
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
    errorCallbackURL: getAuthErrorCallbackURL(),
    newUserCallbackURL: getAuthCallbackURL(),
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
