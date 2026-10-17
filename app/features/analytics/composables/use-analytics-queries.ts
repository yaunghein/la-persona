import { keepPreviousData, useQuery } from '@tanstack/vue-query';
import type {
  CardAnalyticsSummary,
  CommunityInsightsData,
} from '~~/shared/contracts/analytics';
import type { AnalyticsPeriod } from '~~/shared/utils/analytics-period';
import { timezoneOffsetQuery } from '~~/shared/utils/datetime';

/** One organization's cards, or every card the user holds (`workspace`). */
export type AnalyticsScope = { organizationSlug: string } | { workspace: true };

export const analyticsQueryKeys = {
  all: ['analytics'] as const,
  cards: (scope: AnalyticsScope, period: AnalyticsPeriod, cardId: string | null) =>
    [...analyticsQueryKeys.all, 'cards', scope, period, cardId] as const,
  community: (organizationSlug: string, period: AnalyticsPeriod) =>
    [...analyticsQueryKeys.all, 'community', organizationSlug, period] as const,
};

export function useCardAnalyticsQuery(
  params: MaybeRefOrGetter<{
    scope: AnalyticsScope | null;
    period: AnalyticsPeriod;
    cardId: string | null;
  }>
) {
  return useQuery({
    queryKey: computed(() => {
      const { scope, period, cardId } = toValue(params);
      return analyticsQueryKeys.cards(scope ?? { workspace: true }, period, cardId);
    }),
    queryFn: () => {
      const { scope, period, cardId } = toValue(params);
      const url =
        scope && 'organizationSlug' in scope
          ? `/api/organizations/${scope.organizationSlug}/analytics`
          : '/api/me/analytics';
      return $fetch<CardAnalyticsSummary>(url, {
        query: { period, ...(cardId ? { cardId } : {}), ...timezoneOffsetQuery() },
      });
    },
    enabled: () => !!toValue(params).scope,
    placeholderData: keepPreviousData,
  });
}

export function useCommunityInsightsQuery(
  organizationSlug: MaybeRefOrGetter<string>,
  period: MaybeRefOrGetter<AnalyticsPeriod>,
  options: { enabled?: MaybeRefOrGetter<boolean> } = {}
) {
  return useQuery({
    queryKey: computed(() =>
      analyticsQueryKeys.community(toValue(organizationSlug), toValue(period))
    ),
    queryFn: () =>
      $fetch<CommunityInsightsData>(
        `/api/organizations/${toValue(organizationSlug)}/insights`,
        { query: { period: toValue(period), ...timezoneOffsetQuery() } }
      ),
    enabled: () => !!toValue(organizationSlug) && toValue(options.enabled ?? true),
  });
}
