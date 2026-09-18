const PLATFORM_ROOT = '/platform';
const THAKHIN_ROOT = '/thakhin';
const INVITE_ROOT = '/invite';

export const ROUTES = {
  HOME: '/',
  SIGN_IN: '/sign-in',
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
  },
  API: '/api',
} as const;

export function isProtectedInvitePath(path: string) {
  return (
    /^\/invite\/card\/[^/]+\/?$/.test(path) ||
    /^\/invite\/community\/(?:accept|join)\/[^/]+\/?$/.test(path)
  );
}
