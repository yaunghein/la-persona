import type { CardSubscriptionOverview } from '~~/shared/contracts/billing';
import {
  effectiveSubscriptionStatus,
  type SubscriptionStatus,
} from '~~/shared/utils/subscription';

export const TRIAL_LENGTH_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export type StoredCardSubscription = {
  status: string;
  planCode: string | null;
  isTrial: boolean;
  trialEndAt: Date | null;
  currentPeriodStartAt: Date | null;
  currentPeriodEndAt: Date | null;
};

/** The card's subscription as of now, with a stored-or-implied trial. */
export type CardSubscriptionState = {
  status: SubscriptionStatus;
  planCode: string | null;
  isTrial: boolean;
  trialEndAt: Date | null;
  currentPeriodStartAt: Date | null;
  currentPeriodEndAt: Date | null;
};

/**
 * Personal cards start on a 30-day trial. Cards created before subscriptions
 * existed have no row yet, so the trial is implied from the card's creation
 * date instead of being written during a read.
 */
export function resolveCardSubscriptionState(
  stored: StoredCardSubscription | null,
  cardCreatedAt: Date,
  now = new Date()
): CardSubscriptionState {
  if (!stored) {
    const trialEndAt = new Date(cardCreatedAt.getTime() + TRIAL_LENGTH_DAYS * DAY_MS);
    return {
      status: trialEndAt > now ? 'trial' : 'expired',
      planCode: null,
      isTrial: true,
      trialEndAt,
      currentPeriodStartAt: null,
      currentPeriodEndAt: null,
    };
  }
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

export function daysLeftUntil(endAt: Date | null, now = new Date()) {
  if (!endAt) return null;
  const diff = endAt.getTime() - now.getTime();
  return diff <= 0 ? 0 : Math.ceil(diff / DAY_MS);
}

export function toSubscriptionOverview(
  state: CardSubscriptionState
): CardSubscriptionOverview {
  return {
    status: state.status,
    planCode: state.planCode,
    isTrial: state.isTrial,
    daysLeft: daysLeftUntil(
      state.status === 'trial' ? state.trialEndAt : state.currentPeriodEndAt
    ),
  };
}

export function isOnTrialPlan(state: CardSubscriptionState) {
  return state.isTrial || state.status === 'trial' || !state.planCode;
}

export function isSubscriptionLapsed(state: CardSubscriptionState) {
  return state.status === 'expired' || toSubscriptionOverview(state).daysLeft === 0;
}
