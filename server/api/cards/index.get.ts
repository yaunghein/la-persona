import { findCardsByUserIdAndOrganization } from '~~/server/db/queries/card';
import { requireOrganizationSession } from '~~/server/utils/organization-permissions';

export default defineEventHandler(async (event) => {
  const session = await requireOrganizationSession(event);
  return findCardsByUserIdAndOrganization(
    session.user.id,
    session.session.activeOrganizationId
  );
});
