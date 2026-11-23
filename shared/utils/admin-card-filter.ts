import type { AdminCardSummary } from '~~/shared/contracts/card';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export type AdminCardSubscriptionFilter =
  | 'all'
  | 'live'
  | 'trial'
  | 'active'
  | 'pending_approval'
  | 'expiring'
  | 'expired'
  | 'no_end'
  | 'community'
  | 'company';

export type AdminCardBillingFilter = 'all' | 'paid' | 'free';

const EXPIRING_WITHIN_MS = 30 * 24 * 60 * 60 * 1000;

type FilterableCard = Pick<
  AdminCardSummary,
  'organizationType' | 'userId' | 'subscriptionStatus' | 'subscriptionEndAt'
>;

/** Live means the card still has access: trial, active, or grace. */
function isLive(card: FilterableCard) {
  return (
    card.subscriptionStatus === 'trial' ||
    card.subscriptionStatus === 'active' ||
    card.subscriptionStatus === 'grace'
  );
}

export function matchesSubscriptionFilter(
  card: FilterableCard,
  filter: AdminCardSubscriptionFilter,
  now = new Date()
) {
  if (filter === 'all') return true;
  const isCommunity = card.organizationType === ORGANIZATION_TYPES.COMMUNITY;
  if (filter === 'community') return isCommunity;
  if (filter === 'company') {
    return card.organizationType === ORGANIZATION_TYPES.COMPANY;
  }
  if (isCommunity) return false;
  if (filter === 'no_end')
    return Boolean(card.userId) && !card.subscriptionEndAt;
  if (filter === 'live') return isLive(card);
  if (filter === 'expiring') {
    if (!isLive(card) || !card.subscriptionEndAt) return false;
    const remaining =
      new Date(card.subscriptionEndAt).getTime() - now.getTime();
    return remaining > 0 && remaining <= EXPIRING_WITHIN_MS;
  }
  return card.subscriptionStatus === filter;
}

export function matchesBillingFilter(
  card: Pick<AdminCardSummary, 'subscriptionBilling'>,
  filter: AdminCardBillingFilter
) {
  return filter === 'all' || card.subscriptionBilling === filter;
}
