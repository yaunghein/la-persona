import { isProtectedInvitePath, parsePlatformEventDetailPath } from '~~/shared/utils/routes';
import type { UserOrganization } from '~/composables/user-organizations';
import { isCommunityManager } from '~/composables/user-organizations';
import { QUERY_KEYS } from '~/utils/query-keys';
import type { QueryClient } from '@tanstack/vue-query';

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
    const queryClient = useNuxtApp().$queryClient as QueryClient | undefined;
    let orgs = queryClient?.getQueryData<UserOrganization[]>(
      QUERY_KEYS.organizations
    );
    if (!orgs) {
      try {
        orgs = await $fetch<UserOrganization[]>('/api/organizations');
        queryClient?.setQueryData(QUERY_KEYS.organizations, orgs);
      } catch {
        return navigateTo(ROUTES.EVENTS.PUBLIC(sharedEvent.eventId));
      }
    }
    const org = orgs.find((item) => item.slug === sharedEvent.orgSlug);
    if (!isCommunityManager(org)) {
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
