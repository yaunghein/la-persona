import { auth } from '../../auth';
import { env } from '~~/env';
import { getSafeInternalPath } from '~~/shared/utils/safe-redirect';

export default defineEventHandler((event) => {
  return auth.handler(withMagicLinkErrorCallback(toWebRequest(event)));
});

// Magic-link verify decodes callback query values twice. A walk-in return
// path already contains `?intent=walk-in`, so the error callback becomes a
// relative URL with two "?" and Better Auth rejects the link. Rebuild it as
// a same-origin absolute URL before that check. Links already sent still verify.
function withMagicLinkErrorCallback(request: Request) {
  const url = new URL(request.url);
  if (url.pathname !== '/api/auth/magic-link/verify') return request;

  const errorCallbackURL = url.searchParams.get('errorCallbackURL');
  if (!errorCallbackURL?.startsWith('/')) return request;

  let decoded: string;
  try {
    decoded = decodeURIComponent(errorCallbackURL);
  } catch {
    return request;
  }
  if (decoded.split('?').length < 3) return request;

  const redirectTo = getSafeInternalPath(
    new URL(decoded, env.BASE_URL).searchParams.get('redirectTo')
  );
  if (!redirectTo) return request;

  url.searchParams.set(
    'errorCallbackURL',
    new URL(
      `/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`,
      env.BASE_URL
    ).href
  );
  return new Request(url, request);
}
