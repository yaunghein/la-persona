import type { H3Event } from 'h3';
import type { User, Session } from 'better-auth';
import { auth } from '~~/server/auth';

type AdminSession = {
  user: User & { role?: string | null };
  session: Session;
};

export async function requireAdminSession(event: H3Event) {
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  if (session.user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin permission required',
    });
  }

  return session as AdminSession;
}
