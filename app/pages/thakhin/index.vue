<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale,
} from 'chart.js';
import type { AdminOverview } from '~~/shared/types/admin-overview';

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale
);

definePageMeta({
  layout: 'thakhin',
});

const { data, isLoading } = useQuery({
  queryKey: QUERY_KEYS.adminOverview,
  queryFn: () => $fetch<AdminOverview>('/api/admin/overview'),
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#d4d4d4' } },
  },
  scales: {
    x: {
      ticks: { color: '#a3a3a3', maxTicksLimit: 6 },
      grid: { color: '#2a2a2a' },
    },
    y: {
      beginAtZero: true,
      ticks: { color: '#a3a3a3' },
      grid: { color: '#2a2a2a' },
    },
  },
};

function money(amount: number) {
  return `${amount.toLocaleString()} MMK`;
}

function signed(current: number, previous: number) {
  const diff = current - previous;
  if (diff === 0) return 'Same as last month';
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff.toLocaleString()} vs last month`;
}

const activeChart = computed(() => ({
  labels: (data.value?.series.dailyActive || []).map((point) => point.day.slice(5)),
  datasets: [
    {
      label: 'Daily active users',
      data: (data.value?.series.dailyActive || []).map((point) => point.count),
      borderColor: '#d6b25e',
      backgroundColor: '#d6b25e',
      tension: 0.3,
    },
  ],
}));

const analyticsChart = computed(() => ({
  labels: (data.value?.series.analytics || []).map((point) => point.day.slice(5)),
  datasets: [
    {
      label: 'Views',
      data: (data.value?.series.analytics || []).map((point) => point.views),
      borderColor: '#d6b25e',
      backgroundColor: '#d6b25e',
      tension: 0.3,
    },
    {
      label: 'Other events',
      data: (data.value?.series.analytics || []).map((point) => point.other),
      borderColor: '#8d8d8d',
      backgroundColor: '#8d8d8d',
      tension: 0.3,
    },
  ],
}));

const revenueChart = computed(() => ({
  labels: (data.value?.series.revenue || []).map((point) => point.week.slice(5)),
  datasets: [
    {
      label: 'Approved revenue',
      data: (data.value?.series.revenue || []).map((point) => point.amountMinor),
      borderColor: '#d6b25e',
      backgroundColor: '#d6b25e',
      tension: 0.3,
    },
  ],
}));

const census = computed(() => {
  const overview = data.value;
  if (!overview) return [];
  const analytics = overview.census.analytics;
  return [
    {
      label: 'Users',
      value: overview.census.users.toLocaleString(),
      detail: `${overview.month.newUsers.current.toLocaleString()} new this month`,
      to: ROUTES.THAKHIN.USERS,
    },
    {
      label: 'Daily active',
      value: overview.census.dailyActive.today.toLocaleString(),
      detail: `${overview.census.dailyActive.yesterday.toLocaleString()} yesterday`,
      to: ROUTES.THAKHIN.USERS,
    },
    {
      label: 'Cards',
      value: overview.census.cards.total.toLocaleString(),
      detail: `${overview.census.cards.claimed} claimed · ${overview.census.cards.unclaimed} unclaimed`,
      to: ROUTES.THAKHIN.CARDS,
    },
    {
      label: 'Organizations',
      value: overview.census.organizations.total.toLocaleString(),
      detail: `${overview.census.organizations.personal} personal · ${overview.census.organizations.community} community`,
      to: ROUTES.THAKHIN.ORGANIZATIONS,
    },
    {
      label: 'Communities',
      value: overview.census.communities.toLocaleString(),
      detail: 'Community organizations',
      to: ROUTES.THAKHIN.ORGANIZATIONS,
    },
    {
      label: 'Analytics stored',
      value: analytics.total.toLocaleString(),
      detail: `${analytics.today} today · ${analytics.byType.view} views`,
      to: ROUTES.THAKHIN.CARDS,
    },
    {
      label: 'Contact exchanges',
      value: overview.census.contactExchanges.toLocaleString(),
      detail: 'Stored exchanges',
      to: ROUTES.THAKHIN.CARDS,
    },
    {
      label: 'Events',
      value: overview.census.events.toLocaleString(),
      detail: `${overview.census.liveSubscriptions} live subscriptions`,
      to: ROUTES.THAKHIN.ORGANIZATIONS,
    },
  ];
});
</script>

<template>
  <div class="flex flex-col gap-8">
    <ThakhinPageHeader
      title="Dashboard"
      description="Platform size, what needs a decision, and how this month compares with the last."
    />

    <div v-if="isLoading" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <USkeleton v-for="index in 8" :key="index" class="h-28 rounded-lg" />
    </div>

    <template v-else-if="data">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <NuxtLink
          v-for="item in census"
          :key="item.label"
          :to="item.to"
          class="rounded-lg border border-[#2a2a2a] bg-[#171717] p-4 transition hover:border-[#3a3a3a]"
        >
          <p class="text-xs uppercase tracking-[1.4px] text-white/50">
            {{ item.label }}
          </p>
          <p class="mt-2 text-2xl font-medium text-white">{{ item.value }}</p>
          <p class="mt-1 text-sm text-white/60">{{ item.detail }}</p>
        </NuxtLink>
      </div>

      <div>
        <h2 class="mb-3 text-sm uppercase tracking-[1.4px] text-white/70">
          Needs you
        </h2>
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <NuxtLink
            :to="ROUTES.THAKHIN.REQUESTS"
            class="rounded-lg border border-[#2a2a2a] bg-[#171717] p-4"
          >
            <p class="text-xs uppercase tracking-[1.4px] text-white/50">
              Design requests
            </p>
            <p class="mt-2 text-2xl font-medium text-white">
              {{ data.queues.designRequests.count }}
            </p>
            <p class="mt-1 text-sm text-white/60">
              {{
                data.queues.designRequests.oldestAgeHours == null
                  ? 'None waiting'
                  : `Oldest is ${data.queues.designRequests.oldestAgeHours}h`
              }}
            </p>
          </NuxtLink>
          <NuxtLink
            :to="ROUTES.THAKHIN.PAYMENTS"
            class="rounded-lg border border-[#2a2a2a] bg-[#171717] p-4"
          >
            <p class="text-xs uppercase tracking-[1.4px] text-white/50">
              Standalone payments
            </p>
            <p class="mt-2 text-2xl font-medium text-white">
              {{ data.queues.standalonePayments.count }}
            </p>
            <p class="mt-1 text-sm text-white/60">Submitted, not tied to a request</p>
          </NuxtLink>
          <NuxtLink
            :to="`${ROUTES.THAKHIN.REQUESTS}?tab=updates`"
            class="rounded-lg border border-[#2a2a2a] bg-[#171717] p-4"
          >
            <p class="text-xs uppercase tracking-[1.4px] text-white/50">
              Card updates
            </p>
            <p class="mt-2 text-2xl font-medium text-white">
              {{ data.queues.updateRequests.count }}
            </p>
            <p class="mt-1 text-sm text-white/60">Pending field changes</p>
          </NuxtLink>
          <NuxtLink
            :to="ROUTES.THAKHIN.INVITATIONS"
            class="rounded-lg border border-[#2a2a2a] bg-[#171717] p-4"
          >
            <p class="text-xs uppercase tracking-[1.4px] text-white/50">
              Expiring invitations
            </p>
            <p class="mt-2 text-2xl font-medium text-white">
              {{ data.queues.expiringInvitations.count }}
            </p>
            <p class="mt-1 text-sm text-white/60">Pending and due within 48 hours</p>
          </NuxtLink>
        </div>
      </div>

      <div class="grid gap-3 lg:grid-cols-3">
        <div class="rounded-lg border border-[#2a2a2a] bg-[#171717] p-4">
          <p class="text-xs uppercase tracking-[1.4px] text-white/50">Revenue</p>
          <p class="mt-2 text-2xl font-medium text-white">
            {{ money(data.month.revenue.current) }}
          </p>
          <p class="mt-1 text-sm text-white/60">
            {{ signed(data.month.revenue.current, data.month.revenue.previous) }}
          </p>
        </div>
        <div class="rounded-lg border border-[#2a2a2a] bg-[#171717] p-4">
          <p class="text-xs uppercase tracking-[1.4px] text-white/50">
            Live subscriptions
          </p>
          <p class="mt-2 text-2xl font-medium text-white">
            {{ data.month.liveSubscriptions.toLocaleString() }}
          </p>
          <p class="mt-1 text-sm text-white/60">
            {{ data.month.graceOrExpired.toLocaleString() }} in grace or expired
          </p>
        </div>
        <div class="rounded-lg border border-[#2a2a2a] bg-[#171717] p-4">
          <p class="text-xs uppercase tracking-[1.4px] text-white/50">Invitations</p>
          <p class="mt-2 text-2xl font-medium text-white">
            {{ data.month.invitations.accepted }} /
            {{ data.month.invitations.sent }}
          </p>
          <p class="mt-1 text-sm text-white/60">Accepted of those sent this month</p>
        </div>
      </div>

      <div class="grid gap-4 xl:grid-cols-3">
        <div class="rounded-lg border border-[#2a2a2a] bg-[#171717] p-4">
          <p class="mb-3 text-sm text-white/70">Daily active users</p>
          <div class="h-56">
            <Line :data="activeChart" :options="chartOptions" />
          </div>
        </div>
        <div class="rounded-lg border border-[#2a2a2a] bg-[#171717] p-4">
          <p class="mb-3 text-sm text-white/70">Card analytics</p>
          <div class="h-56">
            <Line :data="analyticsChart" :options="chartOptions" />
          </div>
        </div>
        <div class="rounded-lg border border-[#2a2a2a] bg-[#171717] p-4">
          <p class="mb-3 text-sm text-white/70">Approved revenue</p>
          <div class="h-56">
            <Line :data="revenueChart" :options="chartOptions" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
