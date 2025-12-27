import { createAuthClient } from 'better-auth/vue';

export const authClient = createAuthClient();

export const signIn = async () => {
  const data = await authClient.signIn.social({
    provider: 'github',
    callbackURL: '/platform',
  });
  console.log({ data });
};
