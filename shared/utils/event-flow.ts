import type { ViewerRegistrationStatus } from '~~/shared/types/event';
import { ROUTES } from '~~/shared/utils/routes';

export const COMMUNITY_SETUP_STEPS = [
  'create-card',
  'setting-up',
  'download-wallpaper',
] as const;

export type CommunitySetupStep = (typeof COMMUNITY_SETUP_STEPS)[number];

export type EventFlowViewer = {
  isAuthenticated: boolean;
  isMember: boolean;
  cardSlug: string | null;
  cardComplete: boolean;
  viewerRegistrationStatus: ViewerRegistrationStatus;
};

export function isCommunityCardComplete(card: {
  firstName?: string | null;
  position?: string | null;
  phone?: string | null;
  email?: string | null;
}) {
  return Boolean(
    String(card.firstName || '').trim() &&
      String(card.position || '').trim() &&
      String(card.phone || '').trim() &&
      String(card.email || '').trim()
  );
}

export function parseCommunitySetupStep(value: unknown): CommunitySetupStep | null {
  const step = Array.isArray(value) ? value[0] : value;
  if (typeof step !== 'string') return null;
  return (COMMUNITY_SETUP_STEPS as readonly string[]).includes(step)
    ? (step as CommunitySetupStep)
    : null;
}

function eventHome(eventId?: string | null, orgSlug?: string | null) {
  if (eventId) return ROUTES.EVENTS.PUBLIC(eventId);
  if (orgSlug) return `${ROUTES.PLATFORM.ROOT}/${orgSlug}`;
  return ROUTES.PLATFORM.ROOT;
}

export function resolveCommunitySetupStep(input: {
  cardComplete: boolean;
  requestedStep?: string | null;
}): CommunitySetupStep | null {
  const requested = parseCommunitySetupStep(input.requestedStep);

  if (!input.cardComplete) {
    return 'create-card';
  }

  if (requested === 'download-wallpaper') {
    return 'download-wallpaper';
  }

  return null;
}

export function resolveEventFlowPath(input: {
  eventId?: string | null;
  orgSlug: string;
  viewer: EventFlowViewer;
  source: 'register' | 'mingalarbar' | 'bootstrap' | 'setup';
  setupStep?: string | null;
}): string {
  const { eventId, orgSlug, viewer, source } = input;

  if (!viewer.isAuthenticated) {
    if (source === 'mingalarbar' || source === 'register') {
      return eventId
        ? ROUTES.EVENTS.PUBLIC_MINGALARBAR(eventId)
        : ROUTES.SIGN_IN;
    }
    return ROUTES.SIGN_IN;
  }

  if (!viewer.isMember) {
    if (!eventId) return eventHome(eventId, orgSlug);
    return ROUTES.COMMUNITY_SETUP.BOOTSTRAP(orgSlug, eventId);
  }

  if (!viewer.cardComplete) {
    if (!viewer.cardSlug) {
      if (!eventId) return eventHome(eventId, orgSlug);
      return ROUTES.COMMUNITY_SETUP.BOOTSTRAP(orgSlug, eventId);
    }
    return ROUTES.COMMUNITY_SETUP.CARD(orgSlug, viewer.cardSlug, {
      step: 'create-card',
      eventId: eventId || undefined,
    });
  }

  const continueToWallpaper =
    source === 'setup' &&
    (input.setupStep === 'download-wallpaper' ||
      input.setupStep === 'create-card');

  if (continueToWallpaper) {
    if (!viewer.cardSlug) return eventHome(eventId, orgSlug);
    return ROUTES.COMMUNITY_SETUP.CARD(orgSlug, viewer.cardSlug, {
      step: 'download-wallpaper',
      eventId: eventId || undefined,
    });
  }

  return eventHome(eventId, orgSlug);
}

export function communitySetupSignInPath(orgSlug: string, eventId: string) {
  return {
    path: ROUTES.SIGN_IN,
    query: {
      redirectTo: ROUTES.COMMUNITY_SETUP.BOOTSTRAP(orgSlug, eventId),
    },
  };
}
