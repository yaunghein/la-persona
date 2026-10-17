import {
  isCommunityMemberOnly,
  isCommunityVolunteer,
} from '~~/shared/permissions/organization';

export default defineNuxtRouteMiddleware(async (to) => {
  const orgSlug = to.params.orgSlug;
  if (typeof orgSlug !== 'string' || !orgSlug) return;
  if (!to.path.startsWith(`${ROUTES.PLATFORM.ROOT}/`)) return;

  const orgs = await loadUserOrganizations().catch(() => null);
  if (!orgs) return;

  const org = orgs.find((item) => item.slug === orgSlug);
  const access = { type: org?.type, role: org?.role };
  const isVolunteer = isCommunityVolunteer(access);
  if (!isCommunityMemberOnly(access) && !isVolunteer) return;

  const base = `${ROUTES.PLATFORM.ROOT}/${orgSlug}`;
  if (
    to.path === base ||
    to.path === `${base}/events` ||
    to.path === `${base}/about` ||
    to.path === `${base}/cards` ||
    to.path.startsWith(`${base}/community-setup`) ||
    to.path.startsWith(`${base}/cards/`) ||
    (isVolunteer && to.path.startsWith(`${base}/events/`))
  ) {
    return;
  }

  return navigateTo(base);
});
