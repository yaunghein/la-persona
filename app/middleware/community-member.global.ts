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

  let orgs: UserOrganization[] = [];
  try {
    orgs = await $fetch<UserOrganization[]>('/api/organizations');
  } catch {
    return;
  }

  const org = orgs.find((item) => item.slug === orgSlug);
  if (!isCommunityMemberOnly({ type: org?.type, role: org?.role })) return;

  const base = `${ROUTES.PLATFORM.ROOT}/${orgSlug}`;
  if (to.path === `${base}/events` || to.path === `${base}/about`) return;

  return navigateTo(`${base}/events`);
});
