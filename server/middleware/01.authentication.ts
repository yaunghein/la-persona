import type { H3Event } from 'h3';
import { auth } from '~~/server/auth';
import { insertDailyActivity } from '~~/server/features/analytics/user-activity.repository';
import type { Principal } from '~~/server/utils/authorization';
import { yangonDay } from '~~/server/utils/yangon';

const DAILY_ACTIVITY_COOKIE = 'lp_active_day';
const SKIPPED_PATH_PREFIXES = ['/_nuxt', '/_ipx', '/__nuxt', '/api/auth/'];

/**
 * Resolves the better-auth session once per request and exposes it as
 * `event.context.principal`. Authorization happens later (access boundary +
 * route policies); this middleware never rejects a request.
 */
export default defineEventHandler(async (event) => {
  const path = event.path.split('?')[0] || '';
  if (SKIPPED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) return;

  const resolved = await auth.api.getSession({ headers: event.headers });
  if (!resolved) return;

  const principal: Principal = {
    user: resolved.user,
    session: resolved.session,
    isPlatformAdmin: resolved.user.role === 'admin',
    impersonatorId: resolved.session.impersonatedBy ?? null,
  };
  event.context.principal = principal;
  await recordDailyActivity(event, principal);
});

async function recordDailyActivity(event: H3Event, principal: Principal) {
  // Impersonated sessions count toward the admin, not the impersonated user.
  const actorId = principal.impersonatorId ?? principal.user.id;
  const day = yangonDay();
  const marker = `${actorId}:${day}`;
  if (getCookie(event, DAILY_ACTIVITY_COOKIE) === marker) return;

  try {
    await insertDailyActivity(actorId, day);
    setCookie(event, DAILY_ACTIVITY_COOKIE, marker, {
      httpOnly: true,
      secure: !import.meta.dev,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 36,
    });
  } catch {
    // Activity tracking must not fail the request.
  }
}
