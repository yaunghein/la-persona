import { auth } from '~~/server/auth';
import { findCardsByUserId } from '~~/server/db/queries/card';

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.headers,
  });
  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized.',
    });
  }
  return findCardsByUserId(session.user.id);
});
