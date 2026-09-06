import { and, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { card, cardUpdateRequest } from '~~/server/db/schema';
import { cardUpdateRequestInsertSchema } from '~~/shared/types';
import {
  hasOrganizationPermission,
  requireOrganizationPermission,
} from '~~/server/utils/organization-permissions';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';

export default defineEventHandler(async (event) => {
  const session = await requireOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.CARD_REQUEST_UPDATE
  );

  const result = await readValidatedBody(
    event,
    cardUpdateRequestInsertSchema.safeParse
  );

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: result.error.issues,
    });
  }

  try {
    const organizationId = session.session.activeOrganizationId;
    const userId = session.user.id;
    const canReadAllCards = await hasOrganizationPermission(
      event,
      ORGANIZATION_PERMISSIONS.CARD_READ_ALL,
      organizationId
    );

    const targetCard = await db.query.card.findFirst({
      where: and(
        eq(card.id, result.data.cardId),
        eq(card.organizationId, organizationId),
        ...(canReadAllCards ? [] : [eq(card.userId, userId)])
      ),
      columns: { id: true },
    });
    if (!targetCard) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have access to this card.',
      });
    }

    const [inserted] = await db
      .insert(cardUpdateRequest)
      .values({
        ...result.data,
        requestedBy: session.user.id,
        status: 'pending',
      })
      .returning();

    return inserted;
  } catch (e) {
    console.log(e);
    return handleApiError(e, {
      statusMessage: 'Failed to submit update request',
    });
  }
});
