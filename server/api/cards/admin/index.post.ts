import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '~~/server/db';
import { card, organization } from '~~/server/db/schema';
import { slugify } from '~~/shared/utils/slugify';
import { ensureCardTrialSubscription } from '~~/server/services/subscription';
import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { env } from '~~/server/utils/env';
import {
  optionalHttpUrl,
  optionalS3ObjectKey,
} from '~~/server/utils/zod-admin-card';

const adminCreateCardSchema = z.object({
  /** Omit to use `PLACEHOLDER_ORGANIZATION_ID` (Thakhin “create card” flow). */
  organizationId: z.string().min(1).optional(),
  firstName: z.string().trim().optional().nullable(),
  lastName: z.string().trim().optional().nullable(),
  position: z.string().trim().optional().nullable(),
  company: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  email: z
    .union([z.string().email(), z.literal('')])
    .optional()
    .nullable()
    .transform((v) => (v === '' || v === undefined ? null : v)),
  website: z.string().trim().optional().nullable(),
  splineUrl: optionalHttpUrl,
  avatarUrl: optionalHttpUrl,
  wallpaperUrl: optionalS3ObjectKey('Wallpaper'),
  cardBackUrl: optionalS3ObjectKey('Card back'),
});

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);

  const result = await readValidatedBody(
    event,
    adminCreateCardSchema.safeParse
  );
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: result.error.issues,
    });
  }

  const organizationId =
    result.data.organizationId?.trim() || env.PLACEHOLDER_ORGANIZATION_ID;

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, organizationId),
    columns: { id: true },
  });
  if (!org) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Organization not found',
    });
  }

  const firstName = result.data.firstName?.trim() || 'Card';
  const lastName = result.data.lastName?.trim() || null;
  const position = result.data.position?.trim() || 'Professional';
  const baseSlug = slugify(firstName) || 'card';
  const slug = `${baseSlug}-${nanoid(8)}`;

  try {
    const [newCard] = await db
      .insert(card)
      .values({
        firstName,
        lastName,
        slug,
        position,
        company: result.data.company || null,
        phone: result.data.phone || null,
        email: result.data.email,
        website: result.data.website || null,
        splineUrl: result.data.splineUrl ?? null,
        avatarUrl: result.data.avatarUrl ?? null,
        wallpaperUrl: result.data.wallpaperUrl ?? null,
        cardBackUrl: result.data.cardBackUrl ?? null,
        organizationId,
        userId: null,
      })
      .returning();

    if (!newCard) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create card',
      });
    }

    await ensureCardTrialSubscription(newCard.id, newCard.createdAt);
    return newCard;
  } catch (e) {
    handleApiError(e, { statusMessage: 'Failed to create card' });
  }
});
