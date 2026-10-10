const PLATFORM_ROOT = '/platform';
const THAKHIN_ROOT = '/thakhin';
const INVITE_ROOT = '/invite';

export const ROUTES = {
  HOME: '/',
  SIGN_IN: '/sign-in',
  EVENTS: {
    PUBLIC: (eventId: string) => `/events/${eventId}`,
    PUBLIC_MINGALARBAR: (eventId: string) =>
      `/events/${eventId}?onboarding=mingalarbar`,
    PLATFORM_LIST: (orgSlug: string) => `${PLATFORM_ROOT}/${orgSlug}/events`,
    PLATFORM_LIST_EVENT: (orgSlug: string, eventId: string) =>
      `${PLATFORM_ROOT}/${orgSlug}/events?event=${encodeURIComponent(eventId)}`,
    PLATFORM: (orgSlug: string, eventId: string) =>
      `${PLATFORM_ROOT}/${orgSlug}/events/${eventId}`,
  },
  COMMUNITY_SETUP: {
    BOOTSTRAP: (orgSlug: string, eventId: string) =>
      `${PLATFORM_ROOT}/${orgSlug}/community-setup/${eventId}`,
    CARD: (
      orgSlug: string,
      cardSlug: string,
      params?: { step?: string; eventId?: string }
    ) => {
      const path = `${PLATFORM_ROOT}/${orgSlug}/cards/${cardSlug}/community-setup`;
      const query = new URLSearchParams();
      if (params?.step) query.set('step', params.step);
      if (params?.eventId) query.set('eventId', params.eventId);
      const qs = query.toString();
      return qs ? `${path}?${qs}` : path;
    },
  },
  INVITE: {
    ROOT: INVITE_ROOT,
    CARD: (token: string) => `${INVITE_ROOT}/card/${token}`,
    COMMUNITY_ACCEPT: (token: string) =>
      `${INVITE_ROOT}/community/accept/${token}`,
    COMMUNITY_JOIN: (token: string) => `${INVITE_ROOT}/community/join/${token}`,
  },
  PLATFORM: {
    ROOT: PLATFORM_ROOT,
    CARDS: `${PLATFORM_ROOT}/cards`,
    CONTACTS: `${PLATFORM_ROOT}/contacts`,
  },
  THAKHIN: {
    ROOT: THAKHIN_ROOT,
    REQUESTS: `${THAKHIN_ROOT}/requests`,
    PAYMENTS: `${THAKHIN_ROOT}/payments`,
    ORGANIZATIONS: `${THAKHIN_ROOT}/organizations`,
    USERS: `${THAKHIN_ROOT}/users`,
    CARDS: `${THAKHIN_ROOT}/cards`,
    INVITATIONS: `${THAKHIN_ROOT}/invitations`,
    INBOX: `${THAKHIN_ROOT}/inbox`,
  },
  API: '/api',
} as const;

export function isProtectedInvitePath(path: string) {
  return /^\/invite\/(?:card|community\/(?:accept|join))\/[^/]+\/?$/.test(path);
}

export function parsePlatformEventDetailPath(path: string) {
  const match = path.match(/^\/platform\/([^/]+)\/events\/([^/]+)\/?$/);
  if (!match) return null;
  return { orgSlug: match[1], eventId: match[2] };
}

export function isCommunitySetupBootstrapPath(path: string) {
  return /^\/platform\/[^/?#]+\/community-setup\/[^/?#]+\/?(?:[?#]|$)/.test(
    path
  );
}

export function publicEventAbsoluteUrl(eventId: string) {
  if (!import.meta.client) return ROUTES.EVENTS.PUBLIC(eventId);
  return `${window.location.origin}${ROUTES.EVENTS.PUBLIC(eventId)}`;
}

export function communityCardPath(cardSlug: string) {
  return `/c/${cardSlug}`;
}
