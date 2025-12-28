const PLATFORM_ROOT = '/platform' as const;

export const ROUTES = {
  home: '/',
  signIn: '/sign-in',
  platform: {
    root: PLATFORM_ROOT,
    cards: `${PLATFORM_ROOT}/cards`,
  },
} as const;
