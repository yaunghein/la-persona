import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '~~/server/db';
import { card, organization } from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';
import {
  optionalHttpUrl,
  optionalS3ObjectKey,
} from '~~/server/utils/zod-admin-card';

const adminUpdateCardSchema = z.object({
  organizationId: z.string().min(1).optional(),
  firstName: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().trim().min(1).optional()
  ),
  lastName: z.string().trim().optional().nullable(),
  position: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().trim().min(1).optional()
  ),
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

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Card id is required' });
  }

  const result = await readValidatedBody(event, adminUpdateCardSchema.safeParse);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: result.error.issues,
    });
  }

  const existing = await db.query.card.findFirst({
    where: eq(card.id, id),
    columns: { id: true },
  });
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Card not found' });
  }

  if (result.data.organizationId) {
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, result.data.organizationId),
      columns: { id: true },
    });
    if (!org) {
      throw createError({ statusCode: 400, statusMessage: 'Organization not found' });
    }
  }

  const payload = Object.fromEntries(
    Object.entries(result.data).filter(([, v]) => v !== undefined)
  ) as z.infer<typeof adminUpdateCardSchema>;

  if (payload.lastName !== undefined) {
    const trimmed = payload.lastName?.trim();
    payload.lastName = trimmed || null;
  }

  const [updated] = await db
    .update(card)
    .set({
      ...payload,
      updatedAt: new Date(),
    })
    .where(eq(card.id, id))
    .returning();

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Card not found' });
  }

  return updated;
});
