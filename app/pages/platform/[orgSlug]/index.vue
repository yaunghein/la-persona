<script setup lang="ts">
import type { AnalyticsPeriod } from '~~/shared/utils/analytics-period';
import { timezoneOffsetQuery } from '~~/shared/utils/datetime';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

definePageMeta({
  layout: 'platform',
});

const route = useRoute();
const orgSlug = computed(() => String(route.params.orgSlug || ''));

const { data: session } = await authClient.useSession(useFetch);
const { data: userOrgs, isLoading: isOrgsLoading } = useUserOrganizations();

const currentOrg = computed(() =>
  (userOrgs.value || []).find((org) => org.slug === orgSlug.value)
);

const showCommunityInsights = computed(() =>
  isCommunityManager(currentOrg.value)
);
const showCompanyAnalytics = computed(
  () =>
    currentOrg.value?.type === ORGANIZATION_TYPES.COMPANY &&
    currentOrg.value.role === 'admin'
);
const isCompanyMember = computed(
  () =>
    currentOrg.value?.type === ORGANIZATION_TYPES.COMPANY &&
    currentOrg.value.role !== 'admin'
);
const isCommunityMember = computed(
  () =>
    currentOrg.value?.type === ORGANIZATION_TYPES.COMMUNITY &&
    !showCommunityInsights.value
);
const isPersonalDashboard = computed(
  () => currentOrg.value?.type === ORGANIZATION_TYPES.PERSONAL
);

watch(
  isCompanyMember,
  (isMember) => {
    if (!isMember) return;
    navigateTo(`${ROUTES.PLATFORM.ROOT}/${orgSlug.value}/cards`, {
      replace: true,
    });
  },
  { immediate: true }
);

watch(
  isCommunityMember,
  (isMember) => {
    if (!isMember) return;
    navigateTo(`${ROUTES.PLATFORM.ROOT}/${orgSlug.value}/events`, {
      replace: true,
    });
  },
  { immediate: true }
);

const communityPeriod = ref<AnalyticsPeriod>('7d');
const companyPeriod = ref<AnalyticsPeriod>('30d');
const companyDepartmentId = ref('all');
const { data: companyDepartments, refresh: refreshCompanyDepartments } =
  useFetch<{ items: { id: string; name: string }[] }>(
    () => `/api/organizations/${orgSlug.value}/departments` as string,
    { immediate: false, watch: false }
  );
const { data: companyInsights, refresh: refreshCompanyInsights } = useFetch<{
  views: number;
  saves: number;
  clicks: number;
  contacts: number;
  dailyViews: { date: string; count: number }[];
  dailyContacts: { date: string; count: number }[];
  members: {
    id: string;
    name: string;
    departmentName: string | null;
    views: number;
    contacts: number;
  }[];
}>(
  () => {
    const department =
      companyDepartmentId.value === 'all'
        ? ''
        : `&departmentId=${companyDepartmentId.value}`;
    const { tzOffset } = timezoneOffsetQuery();
    return `/api/organizations/${orgSlug.value}/company-insights?period=${companyPeriod.value}&tzOffset=${tzOffset}${department}` as string;
  },
  { immediate: false, watch: false }
);
watch(
  [showCompanyAnalytics, companyPeriod, companyDepartmentId],
  ([show]) => {
    if (show) refreshCompanyInsights();
  },
  { immediate: true }
);
watch(showCompanyAnalytics, (show) => {
  if (show) refreshCompanyDepartments();
});

watch(orgSlug, () => {
  communityPeriod.value = '7d';
});

const {
  data: communityInsights,
  isPending: isCommunityInsightsPending,
  isError: isCommunityInsightsError,
} = useCommunityInsightsQuery(orgSlug, communityPeriod, {
  enabled: showCommunityInsights,
});
</script>

<template>
  <div v-if="isOrgsLoading" class="flex flex-col gap-4">
    <USkeleton class="h-8 w-64 rounded-md" />
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      <USkeleton v-for="i in 4" :key="i" class="h-32 rounded-lg" />
    </div>
    <USkeleton class="h-80 w-full rounded-lg" />
  </div>

  <AnalyticsCompanyInsights
    v-else-if="showCompanyAnalytics"
    v-model:period="companyPeriod"
    v-model:department-id="companyDepartmentId"
    :views="companyInsights?.views ?? 0"
    :clicks="companyInsights?.clicks ?? 0"
    :contacts="companyInsights?.contacts ?? 0"
    :daily-views="companyInsights?.dailyViews ?? []"
    :daily-contacts="companyInsights?.dailyContacts ?? []"
    :members="companyInsights?.members ?? []"
    :departments="companyDepartments?.items ?? []"
  />

  <div v-else-if="showCommunityInsights">
    <div v-if="isCommunityInsightsPending" class="flex flex-col gap-4">
      <USkeleton class="h-8 w-64 rounded-md" />
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <USkeleton v-for="i in 6" :key="i" class="h-32 rounded-lg" />
      </div>
      <USkeleton class="h-80 w-full rounded-lg" />
    </div>
    <p
      v-else-if="isCommunityInsightsError || !communityInsights"
      class="text-sm text-subtle"
    >
      Could not load community insights.
    </p>
    <AnalyticsCommunityInsights
      v-else
      v-model:period="communityPeriod"
      :data="communityInsights"
    />
  </div>

  <AnalyticsPersonalInsights
    v-else-if="isPersonalDashboard"
    workspace
    :org-slug="orgSlug"
    :user-name="session?.user?.name"
  />
</template>
