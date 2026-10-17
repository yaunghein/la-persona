import type {
  CardPaymentKind,
  CardPaymentQuote,
  CardPaymentScenario,
} from '~~/shared/contracts/billing';
import {
  isOnTrialPlan,
  isSubscriptionLapsed,
  type CardSubscriptionState,
} from '~~/server/features/billing/card-subscription-state';

export type CardPricingTable = {
  currency: string;
  standardPlanPriceMinor: number;
  premiumPlanPriceMinor: number;
  customDesignFeeMinor: number;
};

const PREMIUM_PLAN_CODES = new Set(['premium', 'founder-club']);

const UPGRADE_SCENARIOS = new Set<CardPaymentScenario>([
  'trial_to_premium_upgrade',
  'standard_to_premium_upgrade_active',
  'standard_to_premium_upgrade_expired',
]);

export function resolveCardPaymentScenario(
  kind: CardPaymentKind,
  subscription: CardSubscriptionState
): CardPaymentScenario {
  if (kind === 'renewal') {
    if (isOnTrialPlan(subscription)) return 'trial_to_standard_renewal';
    return PREMIUM_PLAN_CODES.has(subscription.planCode ?? '')
      ? 'premium_renewal'
      : 'standard_renewal';
  }

  if (subscription.isTrial || subscription.status === 'trial') {
    return 'trial_to_premium_upgrade';
  }
  return isSubscriptionLapsed(subscription)
    ? 'standard_to_premium_upgrade_expired'
    : 'standard_to_premium_upgrade_active';
}

export function isPremiumUpgrade(scenario: CardPaymentScenario) {
  return UPGRADE_SCENARIOS.has(scenario);
}

/**
 * Price breakdown for a scenario. Upgrades waive hosting for the term and
 * charge the custom design fee; renewals charge the plan's hosting fee.
 */
export function quoteCardPayment(
  kind: CardPaymentKind,
  scenario: CardPaymentScenario,
  pricing: CardPricingTable
): CardPaymentQuote {
  const upgrade = isPremiumUpgrade(scenario);
  const planCode =
    scenario === 'trial_to_standard_renewal' || scenario === 'standard_renewal'
      ? 'standard'
      : 'premium';

  const lines = upgrade
    ? [
        { label: 'Hosting Fee', amountMinor: 0, isFree: true },
        {
          label: 'Custom Design Fee',
          amountMinor: pricing.customDesignFeeMinor,
          isFree: false,
        },
      ]
    : [
        {
          label: 'Hosting Fee',
          amountMinor:
            scenario === 'premium_renewal'
              ? pricing.premiumPlanPriceMinor
              : pricing.standardPlanPriceMinor,
          isFree: false,
        },
      ];

  return {
    kind,
    scenario,
    planCode,
    currency: pricing.currency,
    lines,
    totalAmountMinor: lines.reduce((sum, line) => sum + line.amountMinor, 0),
  };
}

function addYears(base: Date, years: number) {
  const result = new Date(base);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/**
 * The term a payment buys. Renewals start when the current paid period ends
 * (or now if it already lapsed). An upgrade during an active paid period keeps
 * that period; it only changes the plan.
 */
export function resolvePaidTerm(
  scenario: CardPaymentScenario,
  subscription: CardSubscriptionState,
  now = new Date()
): { startAt: Date; endAt: Date } {
  if (
    scenario === 'standard_to_premium_upgrade_active' &&
    subscription.currentPeriodStartAt &&
    subscription.currentPeriodEndAt
  ) {
    return {
      startAt: subscription.currentPeriodStartAt,
      endAt: subscription.currentPeriodEndAt,
    };
  }
  const periodEnd = subscription.currentPeriodEndAt;
  const startAt = periodEnd && periodEnd > now ? periodEnd : now;
  return { startAt, endAt: addYears(startAt, 1) };
}
