import { updateOrganization } from '~~/server/features/organization/organization-admin.service';
import {
  AdminOrganizationRouteParams,
  UpdateOrganizationRequest,
} from '~~/shared/contracts/organization';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'organization:update');
  const { organizationId } = await parseRouteParams(
    event,
    AdminOrganizationRouteParams
  );
  const changes = await parseRequestBody(event, UpdateOrganizationRequest);

  const result = await updateOrganization(organizationId, changes);
  enrichLog(event, {
    organization: {
      id: organizationId,
      slug: result.slug,
      settings: result.changedCommunityFields,
      apply_to_member_cards: Boolean(changes.applyToMemberCards),
      cards_updated: result.cardsUpdated,
    },
  });
  return result;
});
