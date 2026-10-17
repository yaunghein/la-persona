import { env } from '~~/env';
export default defineNuxtPlugin(async () => {
  const { gtag } = useGtag();
  const { data: session } = await authClient.useSession(useFetch);

  watch(
    session,
    (newSession) => {
      if (newSession?.user) {
        gtag('config', env.GTAG_ID, {
          user_id: newSession.user.id,
        });
      }
    },
    { immediate: true }
  );
});
