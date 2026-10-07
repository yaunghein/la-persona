import { and, eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '~~/server/db';
import { card, organization } from '~~/server/db/schema';
import { upsertCommunitySettingByOrganizationId } from '~~/server/db/queries/community-setting';
import { updateCommunityCardsBrand } from '~~/server/services/community';
import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { slugify } from '~~/shared/utils/slugify';
import { enrichLog } from '~~/server/utils/wide-event';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

const adminUpdateOrganizationSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  slug: z.string().trim().min(1, 'Slug is required').max(200),
  description: z.string().optional(),
  guidelines: z.string().optional(),
  whyJoin: z.string().optional(),
  logoUrl: z.string().optional(),
  coverImageUrl: z.string().optional(),
  splineUrl: z.string().optional(),
  wallpaperUrl: z.string().optional(),
  cardBackUrl: z.string().optional(),
  applyToMemberCards: z.boolean().optional(),
});

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Organization id is required' });
  }
  enrichLog(event, { organization: { id } });

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

  const communityFields = [
    'description',
    'guidelines',
    'whyJoin',
    'logoUrl',
    'coverImageUrl',
    'splineUrl',
    'wallpaperUrl',
    'cardBackUrl',
  ] as const;
  const writesCommunitySettings =
    existing.type === ORGANIZATION_TYPES.COMMUNITY &&
    communityFields.some((field) => result.data[field] !== undefined);

  const [updated] = await db
    .update(organization)
    .set({
      name: result.data.name,
      slug: normalizedSlug,
      ...(writesCommunitySettings && result.data.logoUrl !== undefined
        ? { logo: result.data.logoUrl.trim() || null }
        : {}),
    })
    .where(eq(organization.id, id))
    .returning();

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Organization not found' });
  }

  let cardsUpdated = 0;
  if (writesCommunitySettings) {
    const setting = await upsertCommunitySettingByOrganizationId(existing.id, {
      description: result.data.description ?? '',
      guidelines: result.data.guidelines ?? '',
      whyJoin: result.data.whyJoin ?? '',
      coverUrl: result.data.coverImageUrl?.trim() || null,
      ...(result.data.splineUrl !== undefined
        ? { splineUrl: result.data.splineUrl.trim() }
        : {}),
      ...(result.data.wallpaperUrl !== undefined
        ? { wallpaperUrl: result.data.wallpaperUrl.trim() }
        : {}),
      ...(result.data.cardBackUrl !== undefined
        ? { cardBackUrl: result.data.cardBackUrl.trim() }
        : {}),
    });

    if (result.data.applyToMemberCards && setting) {
      const memberCards = await db
        .select({ id: card.id })
        .from(card)
        .where(eq(card.organizationId, existing.id));
      cardsUpdated = memberCards.length;
      if (cardsUpdated > 0) {
        await updateCommunityCardsBrand(existing.id, {
          splineUrl: setting.splineUrl,
          wallpaperUrl: setting.wallpaperUrl,
          cardBackUrl: setting.cardBackUrl,
        });
      }
    }
  }

  enrichLog(event, {
    organization: {
      slug: updated.slug,
      ...(writesCommunitySettings
        ? {
            settings: communityFields.filter(
              (field) => result.data[field] !== undefined
            ),
            apply_to_member_cards: Boolean(result.data.applyToMemberCards),
            cards_updated: cardsUpdated,
          }
        : {}),
    },
  });

  return { ...updated, cardsUpdated };
});
