import type { CardDetail } from '~~/shared/contracts/card';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export function isCommunityCard(card: Pick<CardDetail, 'organization'>) {
  return card.organization.type === ORGANIZATION_TYPES.COMMUNITY;
}

export function isCardPendingApproval(card: Pick<CardDetail, 'subscription'>) {
  return card.subscription?.status === 'pending_approval';
}

const SPECIAL_PLAN_LABELS: Record<string, string> = {
  'friend-family': 'Friends & Family',
  'founder-club': "Founders' Club",
  premium: 'Premium',
};

/** Community name for community cards, otherwise the plan (or approval state). */
export function cardBadgeLabel(card: CardDetail): string {
  if (isCommunityCard(card)) return card.organization.name || 'Community';
  if (isCardPendingApproval(card)) return 'Pending';

  const planCode = card.subscription?.planCode;
  // Keep explicit/special plan names visible even during trial periods.
  if (planCode && SPECIAL_PLAN_LABELS[planCode]) {
    return SPECIAL_PLAN_LABELS[planCode];
  }
  if (card.subscription?.status === 'trial' || card.subscription?.isTrial) {
    return 'Standard (Trial)';
  }
  if (card.subscription?.planName?.trim())
    return card.subscription.planName.trim();
  if (planCode === 'standard') return 'Standard';
  return 'No Plan';
}

export function cardBadgeColor(card: CardDetail) {
  if (isCardPendingApproval(card)) return 'warning' as const;
  if (card.subscription?.status === 'active') return 'success' as const;
  return 'neutral' as const;
}

export function cardHolderName(
  card: Pick<CardDetail, 'firstName' | 'lastName'>
) {
  return [card.firstName, card.lastName].filter(Boolean).join(' ').trim();
}

/** Cards are edited inside the organization that owns them. */
export function cardEditorPath(
  card: Pick<CardDetail, 'slug' | 'organization'>
) {
  return `/platform/${card.organization.slug}/cards/${card.slug}`;
}
