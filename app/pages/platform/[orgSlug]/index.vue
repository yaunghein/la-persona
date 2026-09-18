<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

import type { TabsItem } from '@nuxt/ui';
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

const insightsTab = ref('community');
const communityPeriod = ref<AnalyticsPeriod>('7d');

const tabItems = [
  { label: 'Community', value: 'community', slot: 'community' },
  { label: 'Cards', value: 'cards', slot: 'cards' },
] satisfies TabsItem[];

watch(orgSlug, () => {
  insightsTab.value = 'community';
  communityPeriod.value = '7d';
});

const {
  data: communityInsights,
  isPending: isCommunityInsightsPending,
  isError: isCommunityInsightsError,
} = useQuery<CommunityInsightsData>({
  queryKey: [
    ...QUERY_KEYS.communityInsights,
    orgSlug,
    communityPeriod,
  ],
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

  <div v-else-if="showCommunityTabs" class="space-y-6">
    <UTabs
      v-model="insightsTab"
      :items="tabItems"
      color="neutral"
      variant="pill"
      :unmount-on-hide="false"
      :ui="{
        root: 'w-full',
        list: 'bg-[#171717] w-full sm:w-fit rounded-lg p-1',
        indicator: 'bg-[#232323]',
        trigger:
          'data-[state=active]:text-white data-[state=inactive]:text-[#8b8b8b] rounded-md px-4 py-2.5 grow-0 whitespace-nowrap text-center sm:text-left w-full sm:w-fit',
        content: 'pt-6',
      }"
    >
      <template #community>
        <div
          v-if="isCommunityInsightsPending"
          class="flex flex-col gap-4 pb-17 sm:pb-0"
        >
          <USkeleton class="h-8 w-64 rounded-md" />
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <USkeleton v-for="i in 6" :key="i" class="h-32 rounded-lg" />
          </div>
          <USkeleton class="h-80 w-full rounded-lg" />
        </div>
        <p
          v-else-if="isCommunityInsightsError || !communityInsights"
          class="text-sm text-[#8b8b8b]"
        >
          Could not load community insights.
        </p>
        <AnalyticsCommunityInsights
          v-else
          v-model:period="communityPeriod"
          :data="communityInsights"
        />
      </template>
      <template #cards>
        <AnalyticsPersonalInsights
          :org-slug="orgSlug"
          :user-name="session?.user?.name"
          all-cards-heading="Card Analytics"
        />
      </template>
    </UTabs>
  </div>

  <AnalyticsPersonalInsights
    v-else
    :org-slug="orgSlug"
    :user-name="session?.user?.name"
  />
</template>
