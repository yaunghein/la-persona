import { getAdminOverview } from '~~/server/features/admin/overview.repository';
import { listCardsForAdmin } from '~~/server/features/card/card-admin.service';
import type { AdminOverview } from '~~/shared/contracts/admin';
import {
  matchesBillingFilter,
  matchesSubscriptionFilter,
  type AdminCardBillingFilter,
  type AdminCardSubscriptionFilter,
} from '~~/shared/utils/admin-card-filter';

export async function describeAdminOverview(): Promise<AdminOverview> {
  const now = new Date();
  const [overview, cards] = await Promise.all([
    getAdminOverview(),
    listCardsForAdmin({}),
  ]);

  const countCards = (
    subscription: AdminCardSubscriptionFilter,
    billing: AdminCardBillingFilter = 'all'
  ) =>
    cards.items.filter(
      (item) =>
        matchesSubscriptionFilter(item, subscription, now) &&
        matchesBillingFilter(item, billing)
    ).length;

  return {
    ...overview,
    subscriptions: {
      paidLive: countCards('live', 'paid'),
      freeLive: countCards('live', 'free'),
      expiring: countCards('expiring'),
      pendingApproval: countCards('pending_approval'),
      expired: countCards('expired'),
      noEndDate: countCards('no_end'),
    },
  };
}
