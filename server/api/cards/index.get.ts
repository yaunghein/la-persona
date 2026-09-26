import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { organization } from '~~/server/db/schema';
import {
  findCardsByOrganization,
  findCardsByUserIdAndOrganization,
} from '~~/server/db/queries/card';
import { ensureCommunityCard } from '~~/server/services/community';
import { loadWorkspaceCards } from '~~/server/services/workspace-cards';
import {
  hasOrganizationPermission,
  requireOrganizationPermission,
} from '~~/server/utils/organization-permissions';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export default defineEventHandler(async (event) => {
  const session = await requireOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.CARD_READ
  );

  const requestQuery = getQuery(event);
  if (requestQuery.scope === 'workspace') {
    return loadWorkspaceCards(session.user.id);
  }

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, session.session.activeOrganizationId),
    columns: { name: true, type: true },
  });

  if (org?.type === ORGANIZATION_TYPES.COMMUNITY) {
    await ensureCommunityCard(
      session.user.id,
      session.session.activeOrganizationId
    );
  }

  const canReadAll = await hasOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.CARD_READ_ALL,
    session.session.activeOrganizationId
  );

  const cards = canReadAll
    ? await findCardsByOrganization(session.session.activeOrganizationId)
    : await findCardsByUserIdAndOrganization(
        session.user.id,
        session.session.activeOrganizationId
      );

  return cards.map((item) => ({
    ...item,
    organizationName: org?.name ?? null,
    organizationType: org?.type,
  }));
});
