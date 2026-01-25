import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import { cardUpdateRequest } from '~~/server/db/schema';
import { cardUpdateRequestInsertSchema } from '~~/shared/types';

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

  const result = await readValidatedBody(
    event,
    cardUpdateRequestInsertSchema.safeParse
  );

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: result.error.issues,
    });
  }

  try {
    const [inserted] = await db
      .insert(cardUpdateRequest)
      .values({
        ...result.data,
        requestedBy: session.user.id,
        status: 'pending',
      })
      .returning();

    return inserted;
  } catch (e) {
    console.log(e);
    return handleApiError(e, {
      statusMessage: 'Failed to submit update request',
    });
  }
});
