export default defineNuxtRouteMiddleware(async (from, to) => {
  const { data: session } = await authClient.useSession(useFetch);
  const protectedPrefixes = [ROUTES.PLATFORM.ROOT, ROUTES.THAKHIN.ROOT];
  const isProtected = protectedPrefixes.some((prefix) =>
    from.path.startsWith(prefix)
  );

  if (!session.value && isProtected) {
    return navigateTo({
      path: ROUTES.SIGN_IN,
      query: { redirectTo: to.fullPath },
    });
  }
});
