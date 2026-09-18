import { and, eq, inArray } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  card,
  cardRequest,
  cardSubscription,
  organization,
  subscriptionPayment,
  subscriptionPaymentItem,
} from '~~/server/db/schema';
import { requireOrganizationPermission } from '~~/server/utils/organization-permissions';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export default defineEventHandler(async (event) => {
  const session = await requireOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.CARD_DELETE
  );

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, session.session.activeOrganizationId),
    columns: { type: true },
  });

  if (org?.type === ORGANIZATION_TYPES.COMMUNITY) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Community cards cannot be deleted from this page',
    });
  }

  const slug = getRouterParam(event, 'slug');
  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Card slug is required.',
    });
  }

  const targetRows = await db
    .select({
      id: card.id,
      slug: card.slug,
      firstName: card.firstName,
      lastName: card.lastName,
      subscriptionStatus: cardSubscription.status,
    })
    .from(card)
    .leftJoin(cardSubscription, eq(cardSubscription.cardId, card.id))
    .where(
      and(
        eq(card.slug, slug),
        eq(card.userId, session.user.id),
        eq(card.organizationId, session.session.activeOrganizationId)
      )
    )
    .limit(1);

  const targetCard = targetRows[0];
  if (!targetCard) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Card not found.',
    });
  }

  const deletedCard = await db.transaction(async (tx) => {
    if (targetCard.subscriptionStatus === 'pending_approval') {
      const paymentRows = await tx
        .select({
          note: subscriptionPayment.note,
        })
        .from(subscriptionPaymentItem)
        .innerJoin(
          subscriptionPayment,
          eq(subscriptionPayment.id, subscriptionPaymentItem.paymentId)
        )
        .where(
          and(
            eq(subscriptionPaymentItem.cardId, targetCard.id),
            eq(subscriptionPayment.status, 'submitted')
          )
        );

      const requestIds = paymentRows
        .map((row) => {
          const note = row.note || '';
          const match = note.match(
            /^(?:Existing|New) design request \((?<requestId>[^)]+)\)$/
          );
          return match?.groups?.requestId || null;
        })
        .filter((id): id is string => Boolean(id));

      if (requestIds.length > 0) {
        await tx
          .delete(cardRequest)
          .where(
            and(
              inArray(cardRequest.id, requestIds),
              eq(cardRequest.userId, session.user.id),
              eq(cardRequest.status, 'pending')
            )
          );
      }
    }

    const [deleted] = await tx
      .delete(card)
      .where(eq(card.id, targetCard.id))
      .returning({
        id: card.id,
        slug: card.slug,
        firstName: card.firstName,
        lastName: card.lastName,
      });

    if (!deleted) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Card not found.',
      });
    }

    return deleted;
  });

  return {
    success: true,
    card: deletedCard,
  };
});
