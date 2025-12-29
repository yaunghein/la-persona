import { updateCard } from '~~/server/services/card';
import { auth } from '~~/server/auth';

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

  const result = await readValidatedBody(event, UpdateCardSchema.safeParse);

  if (!result.success) {
    throw createError({
      statusCode: 400,
      data: result.error.issues,
    });
  }

  try {
    return await updateCard(session.user.id, result.data);
  } catch (e) {
    handleApiError(e, {
      statusMessage: 'Failed to update card',
    });
  }
});
