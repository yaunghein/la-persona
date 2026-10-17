import { listOrganizationCards } from '~~/server/features/card/card.service';
import { OrganizationRouteParams } from '~~/shared/contracts/organization';

export default defineEventHandler(async (event) => {
  const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
  const access = await authorizeOrganizationAccess(event, orgSlug, 'card:read');
  return listOrganizationCards(
    access.organization.id,
    canAccessOrganization(access, 'card:readAll') ? null : access.principal.user.id
  );
});
