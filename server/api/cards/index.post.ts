import { db } from '~~/server/db';
import { card } from '~~/server/db/schema';
import { ensureCardTrialSubscription } from '~~/server/services/subscription';
import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { z } from 'zod';

const CreateCardSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  position: z.string().min(1, 'Position is required'),
  splineUrl: z.url().optional().nullable(),
});

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);

  // Validate the body
  const result = await readValidatedBody(event, CreateCardSchema.safeParse);

  if (!result.success) {
    throw createError({
      statusCode: 400,
      data: result.error.issues,
    });
  }

  try {
    // Insert the card.
    // userId is omitted here so it remains NULL until claimed.
    const [newCard] = await db
      .insert(card)
      .values({
        firstName: result.data.name,
        lastName: result.data.name,
        slug: slugify(result.data.name),
        position: result.data.position,
        splineUrl: result.data.splineUrl,
      })
      .returning();

    await ensureCardTrialSubscription(newCard.id, newCard.createdAt);

    return newCard;
  } catch (e) {
    handleApiError(e, {
      statusMessage: 'Failed to create card',
    });
  }
});
