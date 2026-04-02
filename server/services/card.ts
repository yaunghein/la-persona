import { nanoid } from 'nanoid';
import { and, eq, isNull, ne } from 'drizzle-orm';
import { db } from '~~/server/db';
import { card } from '~~/server/db/schema';
import { env } from '~~/server/utils/env';
import { ensureCardTrialSubscription } from '~~/server/services/subscription';
import type { UpdateCard } from '~~/shared/types';
import { slugify } from '~~/shared/utils/slugify';

import type { User } from 'better-auth';

export const splitName = (fullName: string | null | undefined) => {
  const name = fullName?.trim() || '';
  if (!name) {
    return { firstName: 'My', lastName: 'Card' };
  }

  const parts = name.split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : 'Card';

  return { firstName, lastName };
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function insertDefaultCard(user: User, organizationId: string) {
  const { firstName, lastName } = splitName(user.name);
  const [inserted] = await db
    .insert(card)
    .values({
      firstName,
      lastName,
      email: user.email,
      slug: `${slugify(user.name)}-${nanoid()}`,
      position: 'Professional',
      userId: user.id,
      splineUrl: env.DEFAULT_SPLINE_URL,
      cardBackUrl: env.DEFAULT_CARD_BACK_URL,
      wallpaperUrl: env.DEFAULT_WALLPAPER_URL,
      organizationId,
    })
    .returning();
  await ensureCardTrialSubscription(inserted.id, inserted.createdAt);
  return inserted;
}

export async function claimUnassignedCard({
  userId,
  organizationId,
  email,
}: {
  userId: string;
  organizationId: string;
  email: string;
}) {
  return await db
    .update(card)
    .set({ userId, updatedAt: new Date() })
    .where(
      and(
        eq(card.organizationId, organizationId),
        eq(card.email, email),
        isNull(card.userId)
      )
    )
    .returning();
}

export async function updateCard(
  userId: string,
  organizationId: string,
  input: UpdateCard
) {
  const { id, ...data } = input;
  const nextData = { ...data };

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Card ID is required for updates.',
    });
  }

  if (typeof data.slug === 'string') {
    const normalizedSlug = slugify(data.slug.replace(/_/g, '-'));

    if (!normalizedSlug) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Please enter a card URL slug.',
      });
    }

    if (!SLUG_PATTERN.test(normalizedSlug)) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Card URL slugs can only include lowercase letters, numbers, and hyphens.',
      });
    }

    const existingCard = await db.query.card.findFirst({
      where: and(eq(card.slug, normalizedSlug), ne(card.id, id)),
      columns: { id: true },
    });

    if (existingCard) {
      throw createError({
        statusCode: 409,
        statusMessage:
          'That card URL is already taken. Please choose a different slug.',
      });
    }

    nextData.slug = normalizedSlug;
  }

  const [updated] = await db
    .update(card)
    .set({ ...nextData, updatedAt: new Date() })
    .where(
      and(eq(card.id, id), eq(card.userId, userId), eq(card.organizationId, organizationId))
    )
    .returning();
  if (!updated) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    });
  }
  return updated;
}
