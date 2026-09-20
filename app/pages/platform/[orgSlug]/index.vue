<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

import { useQuery } from '@tanstack/vue-query';
import { QUERY_KEYS } from '~/utils/query-keys';
import type { CommunityInsightsData } from '~~/shared/types/community-insights';
import type { AnalyticsPeriod } from '~~/shared/utils/analytics-period';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

const route = useRoute();
const orgSlug = computed(() => String(route.params.orgSlug || ''));

const { data: session } = await authClient.useSession(useFetch);
const { data: userOrgs, isLoading: isOrgsLoading } = useUserOrganizations();

const currentOrg = computed(() =>
  (userOrgs.value || []).find((org) => org.slug === orgSlug.value)
);

const isCommunity = computed(
  () => currentOrg.value?.type === ORGANIZATION_TYPES.COMMUNITY
);
const isManager = computed(() => isCommunityManager(currentOrg.value));

const insightsTab = ref<'community' | 'cards'>('community');
const communityPeriod = ref<AnalyticsPeriod>('7d');

watch(orgSlug, () => {
  insightsTab.value = 'community';
  communityPeriod.value = '7d';
});

const {
  data: communityInsights,
  isPending: isCommunityInsightsPending,
  isError: isCommunityInsightsError,
} = useQuery<CommunityInsightsData>({
  queryKey: [...QUERY_KEYS.communityInsights, orgSlug, communityPeriod],
  queryFn: () =>
    $fetch<CommunityInsightsData>('/api/community-insights', {
      query: {
        period: communityPeriod.value,
        organizationSlug: orgSlug.value,
      },
    }),
  enabled: () => isCommunity.value && isManager.value && !!orgSlug.value,
});

const showCommunityTabs = computed(
  () => isCommunity.value && isManager.value
);
</script>

<template>
  <div v-if="isOrgsLoading" class="flex flex-col gap-4">
    <USkeleton class="h-8 w-64 rounded-md" />
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      <USkeleton v-for="i in 4" :key="i" class="h-32 rounded-lg" />
    </div>
    <USkeleton class="h-80 w-full rounded-lg" />
  </div>

  <div v-else-if="showCommunityTabs">
    <div
      v-if="insightsTab === 'community' && isCommunityInsightsPending"
      class="flex flex-col gap-4 pb-17 sm:pb-0"
    >
      <USkeleton class="h-8 w-64 rounded-md" />
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <USkeleton v-for="i in 6" :key="i" class="h-32 rounded-lg" />
      </div>
      <USkeleton class="h-80 w-full rounded-lg" />
    </div>
    <p
      v-else-if="
        insightsTab === 'community' &&
        (isCommunityInsightsError || !communityInsights)
      "
      class="text-sm text-[#8b8b8b]"
    >
      Could not load community insights.
    </p>
    <AnalyticsCommunityInsights
      v-else-if="insightsTab === 'community' && communityInsights"
      v-model:period="communityPeriod"
      :data="communityInsights"
    >
      <template #header-actions>
        <AnalyticsInsightsScopeSwitch v-model="insightsTab" />
      </template>
    </AnalyticsCommunityInsights>
    <AnalyticsPersonalInsights
      v-else
      :org-slug="orgSlug"
      :user-name="session?.user?.name"
      all-cards-heading="Card Analytics"
    >
      <template #header-actions>
        <AnalyticsInsightsScopeSwitch v-model="insightsTab" />
      </template>
    </AnalyticsPersonalInsights>
  </div>

  <AnalyticsPersonalInsights
    v-else
    :org-slug="orgSlug"
    :user-name="session?.user?.name"
  />
</template>
