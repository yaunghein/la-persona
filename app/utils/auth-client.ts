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
import { getSafeInternalPath } from '~~/shared/utils/safe-redirect';
import { GOOGLE_CALENDAR_SCOPE } from '~~/shared/constants/google-calendar';
import {
  isCommunitySetupBootstrapPath,
  ROUTES,
} from '~~/shared/utils/routes';

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
          },
        },
      }),
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

  return `${ROUTES.SIGN_IN}?redirectTo=${encodeURIComponent(redirectTo)}`;
}

export const signInWithSocial = async (
  provider: SocialProvider,
  scopes?: string[]
) => {
  await authClient.signIn.social({
    provider,
    scopes,
    callbackURL: getAuthCallbackURL(),
    newUserCallbackURL: getAuthCallbackURL(),
    errorCallbackURL: getAuthErrorCallbackURL(),
  });
};

// Signing in to register for an event is the one place calendar access is asked up front.
function googleSignInScopes() {
  if (!useRuntimeConfig().public.googleCalendarEnabled) return undefined;
  if (!isCommunitySetupBootstrapPath(getAuthRedirectTo())) return undefined;
  return [GOOGLE_CALENDAR_SCOPE];
}

export const signInWithGoogle = async () =>
  signInWithSocial('google', googleSignInScopes());
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
        clearFormDrafts();
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
