export default defineNuxtRouteMiddleware(async (to) => {
  const sessionState = await authClient.useSession(useFetch);
  const session = sessionState?.data;
  const isPlatformRoute = to.path.startsWith(ROUTES.PLATFORM.ROOT);
  const isThakhinRoute = to.path.startsWith(ROUTES.THAKHIN.ROOT);
  const isProtected = isPlatformRoute || isThakhinRoute;

  if (!session?.value && isProtected) {
    return navigateTo({
      path: ROUTES.SIGN_IN,
      query: { redirectTo: to.fullPath },
    });
  }

  const isAdmin = session?.value?.user?.role === 'admin';
  if (isThakhinRoute && !isAdmin) {
    return navigateTo(`${ROUTES.SIGN_IN}?redirectTo=${to.fullPath}`);
  }
});
