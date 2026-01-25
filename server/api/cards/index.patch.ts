import { auth } from '~~/server/auth';
import { updateCard } from '~~/server/services/card';

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

  const result = await readValidatedBody(event, cardUpdateSchema.safeParse);
  console.log(JSON.stringify(result, null, 2));

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
