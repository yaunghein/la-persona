import { EVENT_TIMEZONE_OFFSET_COOKIE } from '~~/shared/utils/event-datetime';

export default defineNuxtPlugin((nuxtApp) => {
  const actual = new Date().getTimezoneOffset();
  const cookie = useCookie(EVENT_TIMEZONE_OFFSET_COOKIE, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    path: '/',
  });
  cookie.value = String(actual);

  nuxtApp.hook('app:mounted', () => {
    const pinned = useState<number | null>('event-tz-offset', () => null);
    if (pinned.value !== actual) pinned.value = actual;
  });
});
