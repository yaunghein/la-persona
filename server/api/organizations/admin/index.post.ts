import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '~~/server/db';
import { member, organization, user } from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { slugify } from '~~/shared/utils/slugify';
import {
  ORGANIZATION_TYPES,
  type OrganizationType,
} from '~~/shared/utils/constants';

const adminCreateOrganizationSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  type: z.enum([
    ORGANIZATION_TYPES.PERSONAL,
    ORGANIZATION_TYPES.COMMUNITY,
  ]),
  slug: z.string().trim().max(200).optional(),
  ownerUserId: z.string().trim().min(1).optional(),
});

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);

  const result = await readValidatedBody(
    event,
    adminCreateOrganizationSchema.safeParse
  );
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: result.error.issues,
    });
  }

  const { name, type, ownerUserId: ownerUserIdRaw } = result.data;
  const isPersonal = type === ORGANIZATION_TYPES.PERSONAL;
  const ownerUserId = ownerUserIdRaw?.trim() || null;

  let normalizedSlug = slugify(result.data.slug || name);
  if (!normalizedSlug || !SLUG_PATTERN.test(normalizedSlug)) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Slug must be lowercase letters, numbers, and hyphens only (e.g. acme-corp)',
    });
  }

  const slugTaken = await db.query.organization.findFirst({
    where: eq(organization.slug, normalizedSlug),
    columns: { id: true },
  });
  if (slugTaken) {
    normalizedSlug = `${normalizedSlug}-${nanoid(6).toLowerCase()}`;
  }

  if (ownerUserId) {
    const owner = await db.query.user.findFirst({
      where: eq(user.id, ownerUserId),
      columns: { id: true },
    });
    if (!owner) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Owner user not found',
      });
    }

    if (type === ORGANIZATION_TYPES.PERSONAL) {
      const existingPersonal = await db
        .select({ id: organization.id })
        .from(organization)
        .innerJoin(member, eq(member.organizationId, organization.id))
        .where(
          and(
            eq(member.userId, ownerUserId),
            eq(organization.type, ORGANIZATION_TYPES.PERSONAL)
          )
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (existingPersonal) {
        throw createError({
          statusCode: 409,
          statusMessage: 'User already has a personal organization',
        });
      }
    }
  }

  const [created] = await db
    .insert(organization)
    .values({
      id: nanoid(),
      name: isPersonal ? `${name}'s Space` : name,
      slug: normalizedSlug,
      type: type as OrganizationType,
      isPersonal,
      createdAt: new Date(),
    })
    .returning();

  if (!created) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create organization',
    });
  }

  if (ownerUserId) {
    await db.insert(member).values({
      id: nanoid(),
      userId: ownerUserId,
      organizationId: created.id,
      role: 'owner',
      createdAt: new Date(),
    });
  }

  return {
    id: created.id,
    name: created.name,
    slug: created.slug,
    logo: created.logo,
    metadata: created.metadata,
    type: created.type,
    createdAt: created.createdAt,
    memberCount: ownerUserId ? 1 : 0,
    cardCount: 0,
  };
});
