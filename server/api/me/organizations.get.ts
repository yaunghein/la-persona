import { listOrganizationsOfUser } from '~~/server/features/organization/community.service';

export default defineEventHandler((event) => {
  const principal = requirePrincipal(event);
  return listOrganizationsOfUser(principal.user.id);
});
