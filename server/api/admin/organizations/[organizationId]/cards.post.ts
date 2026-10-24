import { createMemberCommunityCard } from '~~/server/features/organization/organization-admin.service';
import {
  AdminOrganizationRouteParams,
  CreateMemberCardRequest,
} from '~~/shared/contracts/organization';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'card:create');
  const { organizationId } = await parseRouteParams(
    event,
    AdminOrganizationRouteParams
  );
  const { userId } = await parseRequestBody(event, CreateMemberCardRequest);
  const { card, holderEmail } = await createMemberCommunityCard(
    organizationId,
    userId
  );
  enrichLog(event, {
    organization_id: organizationId,
    card: {
      id: card.id,
      slug: card.slug,
      owner_user_id: userId,
      owner_email: holderEmail,
    },
  });
  return respondCreated(event, `/api/admin/cards/${card.id}`, {
    id: card.id,
    slug: card.slug,
  });
});
