import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '~~/server/db';
import { card, contactExchange } from '~~/server/db/schema';
import { handleApiError } from '~~/server/utils/errors';
import {
  hasOrganizationPermission,
  requireOrganizationPermission,
} from '~~/server/utils/organization-permissions';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';

const createManualContactSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  position: z.string().trim().min(1, 'Professional title / role is required'),
  company: z.string().trim().optional(),
  phone: z.string().trim().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  cardId: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  const session = await requireOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.CONTACT_EXCHANGE_CREATE
  );

  const body = await readValidatedBody(
    event,
    createManualContactSchema.safeParse
  );
  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: body.error.issues,
    });
  }

  try {
    const organizationId = session.session.activeOrganizationId;
    const userId = session.user.id;
    const canReadAllCards = await hasOrganizationPermission(
      event,
      ORGANIZATION_PERMISSIONS.CARD_READ_ALL
    );

    const scopedCards = await db
      .select({ id: card.id })
      .from(card)
      .where(
        and(
          eq(card.organizationId, organizationId),
          ...(canReadAllCards ? [] : [eq(card.userId, userId)])
        )
      )
      .orderBy(desc(card.createdAt))
      .limit(1);
    const fallbackCardId = scopedCards[0]?.id;
    if (!fallbackCardId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No accessible card found in the active organization.',
      });
    }

    const [inserted] = await db
      .insert(contactExchange)
      .values({
        name: `${body.data.firstName} ${body.data.lastName}`.trim(),
        phone: body.data.phone,
        email: body.data.email || null,
        position: body.data.position,
        company: body.data.company?.trim() || null,
        cardId: fallbackCardId,
      })
      .returning();

    return inserted;
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to create contact',
    });
  }
});
