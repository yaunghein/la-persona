import { auth } from '~~/server/auth';
import { getAllContactExchangesForUser } from '~~/server/db/queries/contact-exchange';

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
  return getAllContactExchangesForUser(session.user.id);
});
