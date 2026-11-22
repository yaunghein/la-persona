import type { CardSubscriptionOverview } from '~~/shared/contracts/billing';
import {
  effectiveSubscriptionStatus,
  type SubscriptionStatus,
} from '~~/shared/utils/subscription';

const DAY_MS = 24 * 60 * 60 * 1000;

export type StoredCardSubscription = {
  status: string;
  planCode: string | null;
  isTrial: boolean;
  trialEndAt: Date | null;
  currentPeriodStartAt: Date | null;
  currentPeriodEndAt: Date | null;
};

/** The card's subscription as of now. No row means the card has no period. */
export type CardSubscriptionState = {
  status: SubscriptionStatus;
  planCode: string | null;
  isTrial: boolean;
  trialEndAt: Date | null;
  currentPeriodStartAt: Date | null;
  currentPeriodEndAt: Date | null;
};

export function resolveCardSubscriptionState(
  stored: StoredCardSubscription | null,
  now = new Date()
): CardSubscriptionState | null {
  if (!stored) return null;
  return {
    ...stored,
    status: effectiveSubscriptionStatus(
      stored.status,
      stored.trialEndAt,
      stored.currentPeriodEndAt,
      now
    ),
  };
}

export function toSubscriptionOverview(
  state: CardSubscriptionState
): CardSubscriptionOverview {
  const endAt =
    state.status === 'trial' ? state.trialEndAt : state.currentPeriodEndAt;
  const msLeft = endAt ? endAt.getTime() - Date.now() : null;
  return {
    status: state.status,
    planCode: state.planCode,
    isTrial: state.isTrial,
    daysLeft:
      msLeft === null ? null : msLeft <= 0 ? 0 : Math.ceil(msLeft / DAY_MS),
  };
}

export function isOnTrialPlan(state: CardSubscriptionState) {
  return state.isTrial || state.status === 'trial' || !state.planCode;
}

export function isSubscriptionLapsed(state: CardSubscriptionState) {
  return (
    state.status === 'expired' || toSubscriptionOverview(state).daysLeft === 0
  );
}
