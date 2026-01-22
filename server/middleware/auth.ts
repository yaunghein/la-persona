import { auth } from '~~/server/auth';

export default defineEventHandler(async (event) => {
  const path = event.path;
  const isApi = event.path.startsWith(ROUTES.API);
  const protectedPrefixes = [ROUTES.PLATFORM.ROOT, ROUTES.THAKHIN.ROOT];
  const isProtected = protectedPrefixes.some((prefix) =>
    path.startsWith(prefix)
  );

  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (isProtected && !session && isApi) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  if (session) {
    event.context.user = session.user;
    event.context.session = session.session;
  }
});
