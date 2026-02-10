import { createAuthClient } from 'better-auth/vue';
import {
  magicLinkClient,
  adminClient,
  organizationClient,
} from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  plugins: [magicLinkClient(), adminClient(), organizationClient()],
});

export const signIn = async () => {
  const route = useRoute();
  const redirectTo =
    typeof route.query.redirectTo === 'string'
      ? route.query.redirectTo
      : ROUTES.PLATFORM.ROOT;
  await authClient.signIn.social({
    provider: 'github',
    callbackURL: `/platform?redirectTo=${redirectTo}`,
  });
};

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
