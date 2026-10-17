import type { CardWithContext } from '~~/server/features/card/card.repository';
import type { CardDetail, PublicCard } from '~~/shared/contracts/card';
import type { OrganizationType } from '~~/shared/utils/constants';
import { effectiveSubscriptionStatus } from '~~/shared/utils/subscription';

function subscriptionStatusOf(row: CardWithContext) {
  const { subscription } = row;
  if (!subscription?.status) return null;
  return effectiveSubscriptionStatus(
    subscription.status,
    subscription.trialEndAt,
    subscription.currentPeriodEndAt
  );
}

export function toCardDetail(row: CardWithContext): CardDetail {
  const { card, subscription } = row;
  const status = subscriptionStatusOf(row);
  return {
    id: card.id,
    slug: card.slug,
    firstName: card.firstName,
    lastName: card.lastName,
    position: card.position,
    company: card.company,
    phone: card.phone,
    phoneCountryCode: card.phoneCountryCode,
    email: card.email,
    website: card.website,
    avatarUrl: card.avatarUrl,
    socials: card.socials ?? [],
    splineUrl: card.splineUrl,
    wallpaperUrl: card.wallpaperUrl,
    cardBackUrl: card.cardBackUrl,
    organizationId: card.organizationId,
    userId: card.userId,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
    organization: {
      name: row.organization.name,
      slug: row.organization.slug,
      type: row.organization.type as OrganizationType,
    },
    subscription:
      status && subscription
        ? {
            status,
            planCode: subscription.planCode,
            planName: row.planName,
            isTrial: subscription.isTrial ?? false,
          }
        : null,
  };
}

export function toPublicCard(row: CardWithContext): PublicCard {
  const { card, subscription } = row;
  const status = subscriptionStatusOf(row);
  return {
    slug: card.slug,
    firstName: card.firstName,
    lastName: card.lastName,
    position: card.position,
    company: card.company,
    phone: card.phone,
    phoneCountryCode: card.phoneCountryCode,
    email: card.email,
    website: card.website,
    avatarUrl: card.avatarUrl,
    socials: card.socials ?? [],
    splineUrl: card.splineUrl,
    wallpaperUrl: card.wallpaperUrl,
    cardBackUrl: card.cardBackUrl,
    isClaimed: card.userId !== null,
    joinedAt: card.createdAt.toISOString(),
    plan:
      status && subscription
        ? {
            code: subscription.planCode,
            isTrial: subscription.isTrial ?? false,
            status,
          }
        : null,
  };
}
