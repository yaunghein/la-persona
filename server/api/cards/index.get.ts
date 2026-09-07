import { findCardsByUserIdAndOrganization } from '~~/server/db/queries/card';
import { requireOrganizationPermission } from '~~/server/utils/organization-permissions';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';

export default defineEventHandler(async (event) => {
  const session = await requireOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.CARD_READ
  );
  return findCardsByUserIdAndOrganization(
    session.user.id,
    session.session.activeOrganizationId
  );
});
