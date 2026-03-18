import { findCardBySlugForUserAndOrganization } from '~~/server/db/queries/card';
import { requireOrganizationPermission } from '~~/server/utils/organization-permissions';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';

export default defineEventHandler(async (event) => {
  const session = await requireOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.CARD_READ
  );

  const slug = getRouterParam(event, 'slug') as string;
  const organizationId = session.session.activeOrganizationId;

  const card = await findCardBySlugForUserAndOrganization(
    slug,
    session.user.id,
    organizationId
  );
  if (!card) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Card not found.',
    });
  }
  return card;
});
