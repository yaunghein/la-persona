import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import { card, contactExchange } from '~~/server/db/schema';
import { getPersonalOrganizationByUserId } from '~~/server/services/auth';
import { handleApiError } from '~~/server/utils/errors';

const seamlessExchangeSchema = z
  .object({
    ownerCardId: z.string().trim().min(1).optional(),
    ownerCardSlug: z.string().trim().min(1).optional(),
  })
  .refine((value) => value.ownerCardId || value.ownerCardSlug, {
    message: 'ownerCardId or ownerCardSlug is required.',
  });

type ContactCard = typeof card.$inferSelect;

function getCardDisplayName(value: ContactCard) {
  return [value.firstName, value.lastName].filter(Boolean).join(' ').trim();
}

function toSeamlessContactRow(params: {
  targetCard: ContactCard;
  contactCard: ContactCard;
}) {
  return {
    cardId: params.targetCard.id,
    name: getCardDisplayName(params.contactCard),
    phone: params.contactCard.phone || '',
    email: params.contactCard.email || null,
    company: params.contactCard.company || null,
    position: params.contactCard.position || null,
    source: 'seamless_exchange',
    laPersonaUserId: params.contactCard.userId,
    laPersonaCardId: params.contactCard.id,
  };
}

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const result = await readValidatedBody(event, seamlessExchangeSchema.safeParse);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: result.error.issues,
    });
  }

  try {
    const ownerConditions = result.data.ownerCardId
      ? eq(card.id, result.data.ownerCardId)
      : eq(card.slug, result.data.ownerCardSlug!);

    const [ownerCard] = await db
      .select()
      .from(card)
      .where(ownerConditions)
      .limit(1);

    if (!ownerCard) {
      throw createError({ statusCode: 404, statusMessage: 'Card not found.' });
    }

    if (!ownerCard.userId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'This card is not linked to a La Persona account yet.',
      });
    }

    if (ownerCard.userId === session.user.id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'You cannot exchange contact with your own card.',
      });
    }

    const personalOrganization = await getPersonalOrganizationByUserId(
      session.user.id
    );
    if (!personalOrganization) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Create your La Persona card before using Seamless Exchange.',
      });
    }

    const [scannerCard] = await db
      .select()
      .from(card)
      .where(
        and(
          eq(card.userId, session.user.id),
          eq(card.organizationId, personalOrganization.id)
        )
      )
      .orderBy(desc(card.createdAt))
      .limit(1);

    if (!scannerCard) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Create your La Persona card before using Seamless Exchange.',
      });
    }

    const payload = await db.transaction(async (tx) => {
      const upsertSeamlessContact = async (
        values: ReturnType<typeof toSeamlessContactRow>
      ) => {
        const [row] = await tx
          .insert(contactExchange)
          .values(values)
          .onConflictDoUpdate({
            target: [contactExchange.cardId, contactExchange.laPersonaUserId],
            set: {
              name: values.name,
              phone: values.phone,
              email: values.email,
              company: values.company,
              position: values.position,
              source: values.source,
              laPersonaCardId: values.laPersonaCardId,
              updatedAt: new Date(),
            },
          })
          .returning();

        return row;
      };

      const ownerContact = await upsertSeamlessContact(
        toSeamlessContactRow({
          targetCard: ownerCard,
          contactCard: scannerCard,
        })
      );
      const scannerContact = await upsertSeamlessContact(
        toSeamlessContactRow({
          targetCard: scannerCard,
          contactCard: ownerCard,
        })
      );

      await Promise.all([
        tx
          .update(contactExchange)
          .set({
            reciprocalExchangeId: scannerContact.id,
            updatedAt: new Date(),
          })
          .where(eq(contactExchange.id, ownerContact.id)),
        tx
          .update(contactExchange)
          .set({
            reciprocalExchangeId: ownerContact.id,
            updatedAt: new Date(),
          })
          .where(eq(contactExchange.id, scannerContact.id)),
      ]);

      return {
        ownerContactId: ownerContact.id,
        scannerContactId: scannerContact.id,
        ownerCard: {
          id: ownerCard.id,
          slug: ownerCard.slug,
          name: getCardDisplayName(ownerCard),
        },
        scannerCard: {
          id: scannerCard.id,
          slug: scannerCard.slug,
          name: getCardDisplayName(scannerCard),
        },
      };
    });

    return { success: true, data: payload };
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to complete Seamless Exchange.',
    });
  }
});
