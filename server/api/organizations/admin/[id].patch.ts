import { and, eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '~~/server/db';
import { organization } from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { slugify } from '~~/shared/utils/slugify';

const adminUpdateOrganizationSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  slug: z.string().trim().min(1, 'Slug is required').max(200),
});

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Organization id is required' });
  }

  const result = await readValidatedBody(event, adminUpdateOrganizationSchema.safeParse);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: result.error.issues,
    });
  }

  const existing = await db.query.organization.findFirst({
    where: eq(organization.id, id),
  });
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Organization not found' });
  }

  const normalizedSlug = slugify(result.data.slug);
  if (!normalizedSlug || !SLUG_PATTERN.test(normalizedSlug)) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Slug must be lowercase letters, numbers, and hyphens only (e.g. acme-corp)',
    });
  }

  if (normalizedSlug !== existing.slug) {
    const slugTaken = await db.query.organization.findFirst({
      where: and(eq(organization.slug, normalizedSlug), ne(organization.id, id)),
      columns: { id: true },
    });
    if (slugTaken) {
      throw createError({
        statusCode: 409,
        statusMessage: 'That slug is already used by another organization',
      });
    }
  }

  const [updated] = await db
    .update(organization)
    .set({
      name: result.data.name,
      slug: normalizedSlug,
    })
    .where(eq(organization.id, id))
    .returning();

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Organization not found' });
  }

  return updated;
});
