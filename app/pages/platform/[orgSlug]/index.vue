<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

import type { CommunityInsightsData } from '~~/shared/types/community-insights';
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

/** Mock until community analytics API / schema exists. */
const communityInsightsMock: CommunityInsightsData = {
  title: 'Community Insights',
  periodOptions: [
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
    { label: '90 Days', value: '90d' },
  ],
  metrics: [
    { label: 'Total Members', value: '1,248' },
    { label: 'Total Events', value: '18' },
    { label: 'Active Members', value: '892' },
    { label: 'Registrations', value: '3,462' },
    { label: 'Average Attendance Rate', value: '68%' },
    { label: 'New Members', value: '+46' },
  ],
  memberGrowth: {
    labels: [
      'Jan 10',
      'Jan 11',
      'Jan 12',
      'Jan 13',
      'Jan 14',
      'Jan 15',
      'Jan 16',
    ],
    values: [42, 58, 71, 95, 112, 138, 156],
  },
  eventPerformance: [
    {
      id: '1',
      event: 'Tech Leaders Networking Night',
      registered: 342,
      checkedIn: 218,
      attendance: '64%',
    },
    {
      id: '2',
      event: 'Startup Mixer Yangon #12',
      registered: 280,
      checkedIn: 201,
      attendance: '72%',
    },
    {
      id: '3',
      event: 'Founders & Investors Dinner',
      registered: 48,
      checkedIn: 45,
      attendance: '94%',
    },
  ],
  infoItems: [
    {
      icon: 'i-lucide-users',
      title: 'Track Membership',
      description:
        'See total, active, and new members across your organization.',
    },
    {
      icon: 'i-lucide-calendar',
      title: 'Measure Events',
      description: 'Compare registrations, check-ins, and attendance by event.',
    },
    {
      icon: 'i-lucide-trending-up',
      title: 'Follow Growth',
      description: 'Watch how your community grows over the selected period.',
    },
  ],
};

const communityPeriod = ref('7d');
</script>

<template>
  <div
    v-if="isOrgsLoading"
    class="flex min-h-[calc(100dvh-11rem)] flex-col gap-4"
  >
    <USkeleton class="h-8 w-64 rounded-md" />
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      <USkeleton v-for="i in 4" :key="i" class="h-32 rounded-lg" />
    </div>
    <USkeleton class="h-80 w-full rounded-lg" />
  </div>
  <AnalyticsCommunityInsights
    v-else-if="isCommunity"
    v-model:period="communityPeriod"
    :data="communityInsightsMock"
  />
  <AnalyticsPersonalInsights
    v-else
    :org-slug="orgSlug"
    :user-name="session?.user?.name"
  />
</template>
