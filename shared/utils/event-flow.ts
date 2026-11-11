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

export type RegistrationIntent = 'public' | 'walk_in';

export function registrationIntentFromQuery(
  value: unknown
): RegistrationIntent {
  return value === 'walk-in' ? 'walk_in' : 'public';
}

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

function eventHome(
  eventId?: string | null,
  orgSlug?: string | null,
  intent: RegistrationIntent = 'public'
) {
  if (eventId) {
    return intent === 'walk_in'
      ? ROUTES.EVENTS.WALK_IN(eventId)
      : ROUTES.EVENTS.PUBLIC(eventId);
  }
  if (orgSlug) return `${ROUTES.PLATFORM.ROOT}/${orgSlug}`;
  return ROUTES.PLATFORM.ROOT;
}

export function communitySetupBootstrapPath(
  orgSlug: string,
  eventId: string,
  intent: RegistrationIntent = 'public'
) {
  const path = ROUTES.COMMUNITY_SETUP.BOOTSTRAP(orgSlug, eventId);
  if (intent !== 'walk_in') return path;
  return `${path}?intent=walk-in`;
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
  intent?: RegistrationIntent;
}): string {
  const { eventId, orgSlug, viewer, source } = input;
  const intent = input.intent ?? 'public';

  if (!viewer.isAuthenticated) {
    if (source === 'mingalarbar' || source === 'register') {
      if (!eventId) return ROUTES.SIGN_IN;
      return intent === 'walk_in'
        ? ROUTES.EVENTS.WALK_IN_MINGALARBAR(eventId)
        : ROUTES.EVENTS.PUBLIC_MINGALARBAR(eventId);
    }
    return ROUTES.SIGN_IN;
  }

  if (!viewer.isMember) {
    if (!eventId) return eventHome(eventId, orgSlug, intent);
    return communitySetupBootstrapPath(orgSlug, eventId, intent);
  }

  if (!viewer.cardComplete) {
    if (!viewer.cardSlug) {
      if (!eventId) return eventHome(eventId, orgSlug, intent);
      return communitySetupBootstrapPath(orgSlug, eventId, intent);
    }
    return ROUTES.COMMUNITY_SETUP.CARD(orgSlug, viewer.cardSlug, {
      step: 'create-card',
      eventId: eventId || undefined,
      intent: intent === 'walk_in' ? 'walk-in' : undefined,
    });
  }

  return eventHome(eventId, orgSlug, intent);
}

export function communitySetupSignInPath(
  orgSlug: string,
  eventId: string,
  intent: RegistrationIntent = 'public'
) {
  return {
    path: ROUTES.SIGN_IN,
    query: {
      redirectTo: communitySetupBootstrapPath(orgSlug, eventId, intent),
    },
  };
}
