import type { ViewerRegistrationStatus } from '~~/shared/contracts/event';
import { ROUTES } from '~~/shared/utils/routes';

export const COMMUNITY_SETUP_STEPS = ['create-card'] as const;

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

function eventHome(eventId?: string | null, orgSlug?: string | null) {
  if (eventId) return ROUTES.EVENTS.PUBLIC(eventId);
  if (orgSlug) return `${ROUTES.PLATFORM.ROOT}/${orgSlug}`;
  return ROUTES.PLATFORM.ROOT;
}

export function resolveCommunitySetupStep(input: {
  cardComplete: boolean;
}): CommunitySetupStep | null {
  return input.cardComplete ? null : 'create-card';
}

export function resolveEventFlowPath(input: {
  eventId?: string | null;
  orgSlug: string;
  viewer: EventFlowViewer;
  source: 'register' | 'mingalarbar' | 'bootstrap' | 'setup';
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
