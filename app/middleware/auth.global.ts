import { isProtectedInvitePath } from '~~/shared/utils/routes';

export default defineNuxtRouteMiddleware(async (to) => {
  const sessionState = await authClient.useSession(useFetch);
  const session = sessionState?.data;
  const isPlatformRoute = to.path.startsWith(ROUTES.PLATFORM.ROOT);
  const isThakhinRoute = to.path.startsWith(ROUTES.THAKHIN.ROOT);
  const isInviteRoute = isProtectedInvitePath(to.path);
  const isProtected = isPlatformRoute || isThakhinRoute || isInviteRoute;

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
