import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import { card } from '~~/server/db/schema';
import { z } from 'zod';

const CreateCardSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  position: z.string().min(1, 'Position is required'),
  splineUrl: z.url().optional().nullable(),
  type: z.enum(['founders_club', 'standard']).default('standard'),
});

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

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
        name: result.data.name,
        position: result.data.position,
        splineUrl: result.data.splineUrl,
        type: result.data.type,
      })
      .returning();

    return newCard;
  } catch (e) {
    handleApiError(e, {
      statusMessage: 'Failed to create card',
    });
  }
});
