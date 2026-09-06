import { and, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { card, contactExchange } from '~~/server/db/schema';
import {
  hasOrganizationPermission,
  requireOrganizationPermission,
} from '~~/server/utils/organization-permissions';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';

export default defineEventHandler(async (event) => {
  const session = await requireOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.CONTACT_EXCHANGE_DELETE
  );

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Contact id is required.',
    });
  }

  const orgId = session.session.activeOrganizationId;
  const userId = session.user.id;

  const canReadAllContacts = await hasOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.CONTACT_EXCHANGE_READ_ALL,
    orgId
  );

  const target = await db
    .select({
      id: contactExchange.id,
      cardId: contactExchange.cardId,
      cardOrgId: card.organizationId,
      cardUserId: card.userId,
    })
    .from(contactExchange)
    .leftJoin(card, eq(contactExchange.cardId, card.id))
    .where(eq(contactExchange.id, id))
    .limit(1);

  const row = target[0];
  if (!row) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Contact not found.',
    });
  }

  if (!row.cardId || !row.cardOrgId || row.cardOrgId !== orgId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You do not have access to this contact.',
    });
  }
  if (!canReadAllContacts && row.cardUserId !== userId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You do not have access to this contact.',
    });
  }

  await db.delete(contactExchange).where(eq(contactExchange.id, id));

  return { success: true };
});
