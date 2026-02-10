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
  ArcElement,
} from 'chart.js';

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale,
  ArcElement
);

definePageMeta({
  layout: 'platform',
});

interface DashboardStats {
  totalStats: { type: string; count: number }[];
  dailyViews: { date: string; count: number }[];
  socialClicks: { platform: string; count: number }[];
  linkClicks: { label: string; count: number }[];
  saveActions: { action: string; count: number }[];
}

const selectedCardId = ref('all');

const { data: stats } = useQuery<DashboardStats>({
  queryKey: ['analytics', selectedCardId],
  queryFn: async () =>
    ($fetch as any)('/api/analytics', {
      params: { cardId: selectedCardId.value },
    }),
});

// KPI Computations
const totalViews = computed(
  () => stats.value?.totalStats.find((s) => s.type === 'view')?.count || 0
);
const cardSaves = computed(
  () =>
    stats.value?.totalStats.find((s) => s.type === 'save_action')?.count || 0
);
const socialTotal = computed(
  () =>
    stats.value?.totalStats.find((s) => s.type === 'social_click')?.count || 0
);
const conversionRate = computed(() =>
  totalViews.value > 0
    ? ((cardSaves.value / totalViews.value) * 100).toFixed(0)
    : 0
);

// Save Action Breakdown
const exchangeCount = computed(
  () =>
    stats.value?.saveActions.find((a) => a.action === 'contact_exchange')
      ?.count || 0
);
const vcfCount = computed(
  () =>
    stats.value?.saveActions.find((a) => a.action === 'vcf_download')?.count ||
    0
);

const chartData = computed(() => ({
  labels:
    stats.value?.dailyViews.map((v) =>
      new Date(v.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    ) || [],
  datasets: [
    {
      data: stats.value?.dailyViews.map((v) => v.count) || [],
      borderColor: '#ffffff',
      backgroundColor: '#ffffff',
      tension: 0.4,
      pointRadius: 4,
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      grid: { color: 'rgba(255, 255, 255, 0.05)' },
      ticks: { color: '#666', font: { size: 10 } },
    },
    x: {
      grid: { display: false },
      ticks: { color: '#666', font: { size: 10 } },
    },
  },
  plugins: { legend: { display: false } },
};
</script>

<template>
  <div class="space-y-8 p-4">
    <div class="flex justify-between items-center">
      <h1
        class="text-2xl font-bold uppercase tracking-tight flex items-center gap-2"
      >
        Analytics
        <UIcon name="i-heroicons-information-circle" class="text-gray-600" />
      </h1>
      <USelectMenu v-model="selectedCardId" :options="['all']" class="w-48" />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <AnalyticsStatCard
        title="Total Views"
        :value="totalViews"
        icon="i-heroicons-eye"
      />
      <AnalyticsStatCard
        title="Card Saves (CTR)"
        :value="cardSaves"
        icon="i-heroicons-arrow-down-tray"
      />
      <AnalyticsStatCard
        title="Conversion Rate"
        :value="conversionRate + '%'"
        icon="i-heroicons-receipt-percent"
      />
      <AnalyticsStatCard
        title="Social Clicks"
        :value="socialTotal"
        icon="i-heroicons-share"
      />
    </div>

    <div class="rounded-xl border border-white/5 bg-[#111] p-6">
      <h2
        class="text-sm font-bold uppercase mb-6 tracking-widest text-gray-200"
      >
        Views Over Time
      </h2>
      <div class="h-64"><Line :data="chartData" :options="chartOptions" /></div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <AnalyticsProgressList
        title="Social Media Click-Throughs"
        :items="stats?.socialClicks"
        label-key="platform"
      />
      <AnalyticsProgressList
        title="Portfolio & Link Clicks"
        :items="stats?.linkClicks"
        label-key="label"
      />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div class="rounded-xl border border-white/5 bg-[#111] p-6">
        <h2
          class="text-sm font-bold uppercase mb-6 tracking-widest text-gray-200"
        >
          Card Save Actions
        </h2>
        <div class="space-y-4">
          <AnalyticsSaveAction
            title="Exchange Contacts"
            desc="Direct exchange action"
            :count="exchangeCount"
            icon="i-heroicons-arrows-right-left"
          />
          <AnalyticsSaveAction
            title="Add to Contacts"
            desc="Direct add action"
            :count="vcfCount"
            icon="i-heroicons-arrow-down-tray"
          />
        </div>
      </div>

      <div
        class="rounded-xl border border-white/5 bg-[#111] p-6 flex items-center justify-center"
      >
        <AnalyticsDonutChart :data="[exchangeCount, vcfCount]" />
      </div>
    </div>
  </div>
</template>
