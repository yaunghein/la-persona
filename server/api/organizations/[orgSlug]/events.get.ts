import { listOrganizationEvents } from '~~/server/features/event/event.service';
import { authorizeCommunityAccess } from '~~/server/features/organization/organization.policy';
import { OrganizationRouteParams } from '~~/shared/contracts/organization';

export default defineEventHandler(async (event) => {
  const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
  const { organization, principal } = await authorizeCommunityAccess(
    event,
    orgSlug,
    'event:read'
  );
  return listOrganizationEvents(organization.id, principal.user.id);
});
