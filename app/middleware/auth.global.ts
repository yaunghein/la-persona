import {
  isProtectedInvitePath,
  parsePlatformEventDetailPath,
} from '~~/shared/utils/routes';
import { canRunCommunityCheckIn } from '~/features/organization/utils/organization-roles';

export default defineNuxtRouteMiddleware(async (to) => {
  const sessionState = await authClient.useSession(useFetch);
  const session = sessionState?.data;
  const isPlatformRoute = to.path.startsWith(ROUTES.PLATFORM.ROOT);
  const isThakhinRoute = to.path.startsWith(ROUTES.THAKHIN.ROOT);
  const isInviteRoute = isProtectedInvitePath(to.path);
  const isProtected = isPlatformRoute || isThakhinRoute || isInviteRoute;

  const sharedEvent = parsePlatformEventDetailPath(to.path);

  if (sharedEvent && !session?.value) {
    return navigateTo(ROUTES.EVENTS.PUBLIC(sharedEvent.eventId));
  }

  if (sharedEvent && session?.value) {
    const orgs = await loadUserOrganizations().catch(() => null);
    if (!orgs) return navigateTo(ROUTES.EVENTS.PUBLIC(sharedEvent.eventId));
    const org = orgs.find((item) => item.slug === sharedEvent.orgSlug);
    if (!canRunCommunityCheckIn(org)) {
      return navigateTo(ROUTES.EVENTS.PUBLIC(sharedEvent.eventId));
    }
  }

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
