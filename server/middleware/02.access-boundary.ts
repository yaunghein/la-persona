import type { H3Event } from 'h3';
import { env } from '~~/env';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Fail-closed API perimeter. A route that forgets its policy check is still
 * protected by the prefix it lives under:
 *
 * | Prefix                     | Who                                       |
 * | -------------------------- | ----------------------------------------- |
 * | `/api/public/**`           | anyone                                    |
 * | `/api/auth/organization/**`| nobody over HTTP (app uses its own API)   |
 * | `/api/auth/admin/**`       | platform admins (404 for everyone else)   |
 * | `/api/auth/**`             | anyone (better-auth enforces its own rules)|
 * | `/api/admin/**`            | platform admins (404 for everyone else)   |
 * | any other `/api/**`        | signed-in users (401 otherwise)           |
 *
 * Route handlers still authorize the specific resource (`authorize*Access`).
 */
export default defineEventHandler((event) => {
  const path = event.path.split('?')[0] || '';
  if (!path.startsWith('/api/')) return;

  assertSameOriginWrite(event, path);

  if (path.startsWith('/api/public/')) return;

  if (path.startsWith('/api/auth/')) {
    if (path.startsWith('/api/auth/organization/')) throw notFound();
    if (path.startsWith('/api/auth/admin/')) assertPlatformAdmin(event);
    return;
  }

  if (path.startsWith('/api/admin/')) {
    assertPlatformAdmin(event);
    return;
  }

  if (!event.context.principal) throw unauthorized();
});

function assertPlatformAdmin(event: H3Event) {
  if (!event.context.principal?.isPlatformAdmin) throw notFound();
}

/**
 * CSRF defence for cookie-authenticated writes: browsers always send `Origin`
 * on cross-site POST/PUT/PATCH/DELETE, so a mismatch means a forged request.
 * better-auth applies its own origin check to `/api/auth/**`.
 */
function assertSameOriginWrite(event: H3Event, path: string) {
  if (!STATE_CHANGING_METHODS.has(event.method)) return;
  if (path.startsWith('/api/auth/')) return;

  const origin = getRequestHeader(event, 'origin');
  if (!origin) {
    // Non-browser clients (no cookies sent cross-site) omit Origin; browsers mark fetch metadata.
    const fetchSite = getRequestHeader(event, 'sec-fetch-site');
    if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
      throw forbidden('Cross-site request blocked.', 'cross_site_request');
    }
    return;
  }

  const allowedHosts = new Set([
    getRequestHost(event, { xForwardedHost: true }),
    new URL(env.BASE_URL).host,
  ]);
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw forbidden('Cross-site request blocked.', 'cross_site_request');
  }
  if (!allowedHosts.has(originHost)) {
    throw forbidden('Cross-site request blocked.', 'cross_site_request');
  }
}
