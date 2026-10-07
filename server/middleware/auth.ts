import { auth } from '~~/server/auth';
import { db } from '~~/server/db';
import { userDailyActivity } from '~~/server/db/schema';
import { yangonDay } from '~~/server/utils/yangon';

export default defineEventHandler(async (event) => {
  const path = event.path;
  const isApi = event.path.startsWith(ROUTES.API);
  const protectedPrefixes = [
    ROUTES.PLATFORM.ROOT,
    ROUTES.THAKHIN.ROOT,
    ROUTES.INVITE.ROOT,
  ];
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
    await recordDailyActivity(event, session);
  }
});

async function recordDailyActivity(
  event: Parameters<typeof getCookie>[0],
  session: {
    user: { id: string };
    session: { impersonatedBy?: string | null };
  }
) {
  const actorId = session.session.impersonatedBy || session.user.id;
  const day = yangonDay();
  const cookieName = 'lp_active_day';
  const marker = `${actorId}:${day}`;
  if (getCookie(event, cookieName) === marker) return;

  try {
    await db
      .insert(userDailyActivity)
      .values({ userId: actorId, day })
      .onConflictDoNothing();
    setCookie(event, cookieName, marker, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 36,
    });
  } catch {
    // Activity tracking must not fail the request.
  }
}
