import type { QueryClient } from '@tanstack/vue-query';
import { QUERY_KEYS } from '~/utils/query-keys';
import {
  isCommunityMemberOnly,
  type OrganizationMemberRole,
} from '~~/shared/permissions/organization';
import type { OrganizationType } from '~~/shared/utils/constants';

type UserOrganization = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  type: OrganizationType;
  role: OrganizationMemberRole;
};

export default defineNuxtRouteMiddleware(async (to) => {
  const orgSlug = to.params.orgSlug;
  if (typeof orgSlug !== 'string' || !orgSlug) return;
  if (!to.path.startsWith(`${ROUTES.PLATFORM.ROOT}/`)) return;

  const queryClient = useNuxtApp().$queryClient as QueryClient | undefined;
  const cached = queryClient?.getQueryData<UserOrganization[]>(
    QUERY_KEYS.organizations
  );

  let orgs = cached;
  if (!orgs) {
    try {
      orgs = await $fetch<UserOrganization[]>('/api/organizations');
      queryClient?.setQueryData(QUERY_KEYS.organizations, orgs);
    } catch {
      return;
    }
  }

  const org = orgs.find((item) => item.slug === orgSlug);
  if (!isCommunityMemberOnly({ type: org?.type, role: org?.role })) return;

  const base = `${ROUTES.PLATFORM.ROOT}/${orgSlug}`;
  if (to.path === `${base}/events` || to.path === `${base}/about`) return;

  return navigateTo(`${base}/events`);
});
