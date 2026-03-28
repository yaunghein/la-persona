const PLATFORM_ROOT = '/platform';
const THAKHIN_ROOT = '/thakhin';

export const ROUTES = {
  HOME: '/',
  SIGN_IN: '/sign-in',
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
    CARDS: `${THAKHIN_ROOT}/cards`,
    INVITATIONS: `${THAKHIN_ROOT}/invitations`,
  },
  API: '/api',
} as const;
