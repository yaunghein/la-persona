import {
  findCardBySlugForUserAndOrganization,
  findCardBySlugInOrganization,
} from '~~/server/db/queries/card';
import {
  hasOrganizationPermission,
  requireOrganizationPermission,
} from '~~/server/utils/organization-permissions';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';

export default defineEventHandler(async (event) => {
  const session = await requireOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.CARD_READ
  );

  const slug = getRouterParam(event, 'slug') as string;
  const organizationId = session.session.activeOrganizationId;
  const canReadAll = await hasOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.CARD_READ_ALL,
    organizationId
  );

  const card = canReadAll
    ? await findCardBySlugInOrganization(slug, organizationId)
    : await findCardBySlugForUserAndOrganization(
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
