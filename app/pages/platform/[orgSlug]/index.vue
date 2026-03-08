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
  isOwner: boolean;
  cards: { id: string; label: string }[];
  totalStats: { type: string; count: number }[];
  dailyViews: { date: string; count: number }[];
  socialClicks: { platform: string; count: number }[];
  linkClicks: { label: string; count: number }[];
  saveActions: { action: string; count: number }[];
}

const { data: session } = await authClient.useSession(useFetch);
const selectedCardId = ref('all');

const { data: stats } = useQuery<DashboardStats>({
  queryKey: ['analytics', selectedCardId],
  queryFn: async () =>
    $fetch('/api/analytics', {
      query: { cardId: selectedCardId.value },
    }),
});

const isOwner = computed(() => stats.value?.isOwner === true);
const ownerCardItems = computed(() => [
  { id: 'all', label: 'All Cards' },
  ...(stats.value?.cards || []),
]);
const analyticsHeading = computed(() => {
  if (isOwner.value && selectedCardId.value !== 'all') {
    const selectedCard = ownerCardItems.value.find(
      (item) => item.id === selectedCardId.value
    );
    return `${selectedCard?.label || 'Card'}'s Analytics`;
  }

  const displayName = session.value?.user?.name || 'Your';
  return `${displayName}'s Analytics`;
});

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

const socialCountMap = computed(() => {
  const map = new Map<string, number>();
  for (const item of stats.value?.socialClicks || []) {
    map.set((item.platform || '').toLowerCase(), item.count);
  }
  return map;
});
const socialRows = computed(() => [
  {
    platform: 'LinkedIn',
    icon: 'i-simple-icons-linkedin',
    count: socialCountMap.value.get('linkedin') || 0,
  },
  {
    platform: 'X (Twitter)',
    icon: 'i-simple-icons-x',
    count: socialCountMap.value.get('x') || socialCountMap.value.get('twitter') || 0,
  },
  {
    platform: 'Instagram',
    icon: 'i-simple-icons-instagram',
    count: socialCountMap.value.get('instagram') || 0,
  },
  {
    platform: 'Facebook',
    icon: 'i-simple-icons-facebook',
    count: socialCountMap.value.get('facebook') || 0,
  },
  {
    platform: 'GitHub',
    icon: 'i-simple-icons-github',
    count: socialCountMap.value.get('github') || 0,
  },
]);

const linkCountMap = computed(() => {
  const map = new Map<string, number>();
  for (const item of stats.value?.linkClicks || []) {
    map.set((item.label || '').toLowerCase(), item.count);
  }
  return map;
});
const linkRows = computed(() => [
  { label: 'Personal Website', count: linkCountMap.value.get('personal website') || 0 },
  { label: 'Calendly Booking', count: linkCountMap.value.get('calendly booking') || 0 },
  { label: 'Portfolio PDF', count: linkCountMap.value.get('portfolio pdf') || 0 },
  { label: 'Case Studies', count: linkCountMap.value.get('case studies') || 0 },
]);

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
      borderWidth: 2,
      backgroundColor: 'transparent',
      tension: 0.35,
      pointRadius: 0,
      pointHoverRadius: 3,
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(255, 255, 255, 0.06)' },
      border: { color: 'rgba(255, 255, 255, 0.15)' },
      ticks: { color: '#8b8b8b', font: { size: 10 } },
    },
    x: {
      grid: { color: 'rgba(255, 255, 255, 0.06)' },
      border: { color: 'rgba(255, 255, 255, 0.15)' },
      ticks: { color: '#8b8b8b', font: { size: 10 } },
    },
  },
  plugins: { legend: { display: false } },
};
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="flex items-center gap-3 text-[28px] font-medium uppercase tracking-widest">
        {{ analyticsHeading }}
        <UIcon name="i-lucide-circle-help" class="size-4 text-[#8b8b8b]" />
      </h1>

      <USelectMenu
        v-if="isOwner"
        v-model="selectedCardId"
        value-key="id"
        :items="ownerCardItems"
        :search-input="false"
        class="w-[180px]"
        :ui="{
          base: 'h-[49px] rounded-[8px] border-none bg-[#171717] px-4 text-white',
          content: 'bg-[#171717] border border-[#2a2a2a]',
          item: 'text-white data-[highlighted]:bg-[#232323]',
          value: 'text-white',
        }"
      />
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
      <div class="rounded-[8px] bg-[#171717] px-6 pt-6 pb-7">
        <div class="mb-4 grid size-11 place-items-center rounded-[4px] bg-[#232323]">
          <UIcon name="i-lucide-eye" class="size-5 text-white/70" />
        </div>
        <p class="text-xs font-medium uppercase tracking-[1.2px] text-[#8b8b8b]">Total Views</p>
        <p class="mt-1 text-[32px] font-bold leading-[1.2] text-white">{{ totalViews }}</p>
      </div>
      <div class="rounded-[8px] bg-[#171717] px-6 pt-6 pb-7">
        <div class="mb-4 grid size-11 place-items-center rounded-[4px] bg-[#232323]">
          <UIcon name="i-lucide-download" class="size-5 text-white/70" />
        </div>
        <p class="text-xs font-medium uppercase tracking-[1.2px] text-[#8b8b8b]">Card Saves (CTR)</p>
        <p class="mt-1 text-[32px] font-bold leading-[1.2] text-white">{{ cardSaves }}</p>
      </div>
      <div class="rounded-[8px] bg-[#171717] px-6 pt-6 pb-7">
        <div class="mb-4 grid size-11 place-items-center rounded-[4px] bg-[#232323]">
          <UIcon name="i-lucide-percent" class="size-5 text-white/70" />
        </div>
        <p class="text-xs font-medium uppercase tracking-[1.2px] text-[#8b8b8b]">Conversion Rate</p>
        <p class="mt-1 text-[32px] font-bold leading-[1.2] text-white">{{ conversionRate }}%</p>
      </div>
      <div class="rounded-[8px] bg-[#171717] px-6 pt-6 pb-7">
        <div class="mb-4 grid size-11 place-items-center rounded-[4px] bg-[#232323]">
          <UIcon name="i-lucide-share-2" class="size-5 text-white/70" />
        </div>
        <p class="text-xs font-medium uppercase tracking-[1.2px] text-[#8b8b8b]">Social Clicks</p>
        <p class="mt-1 text-[32px] font-bold leading-[1.2] text-white">{{ socialTotal }}</p>
      </div>
    </div>

    <div class="rounded-[8px] bg-[#171717] p-6">
      <h2 class="text-[32px] font-medium uppercase tracking-[2px]">Views Over Time</h2>
      <p class="mt-1 text-sm text-[#8b8b8b]">Daily card opens for the past 7 days</p>
      <div class="mt-4 h-60"><Line :data="chartData" :options="chartOptions" /></div>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div class="rounded-[8px] bg-[#171717] p-6">
        <h3 class="text-[32px] font-medium uppercase tracking-[2px]">
          Social Media Click-Throughs
        </h3>
        <p class="mt-1 text-sm text-[#8b8b8b]">Which platforms are driving engagement</p>
        <div class="mt-6 space-y-2">
          <div
            v-for="row in socialRows"
            :key="row.platform"
            class="flex items-center justify-between rounded-[4px] bg-[#232323] px-3 py-2"
          >
            <div class="flex items-center gap-2 text-sm">
              <UIcon :name="row.icon" class="size-4 text-white" />
              <span>{{ row.platform }}</span>
            </div>
            <span class="text-sm font-medium">{{ row.count }}</span>
          </div>
        </div>
      </div>

      <div class="rounded-[8px] bg-[#171717] p-6">
        <h3 class="text-[32px] font-medium uppercase tracking-[2px]">Portfolio & Link Clicks</h3>
        <p class="mt-1 text-sm text-[#8b8b8b]">External URL engagement tracking</p>
        <div class="mt-6 space-y-2">
          <div
            v-for="row in linkRows"
            :key="row.label"
            class="flex items-center justify-between rounded-[4px] bg-[#232323] px-3 py-2"
          >
            <div class="flex items-center gap-2 text-sm">
              <UIcon name="i-lucide-link-2" class="size-4 text-white/80" />
              <span>{{ row.label }}</span>
            </div>
            <span class="text-sm font-medium">{{ row.count }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div class="rounded-[8px] bg-[#171717] p-6">
        <h3 class="text-[32px] font-medium uppercase tracking-[2px]">Card Save Actions</h3>
        <p class="mt-1 text-sm text-[#8b8b8b]">Breakdown of how users saved your card</p>
        <div class="mt-6 space-y-3">
          <div class="flex items-center justify-between rounded-[4px] bg-[#232323] p-4">
            <div class="flex items-center gap-3">
              <div class="grid size-9 place-items-center rounded-[4px] bg-[#171717]">
                <UIcon name="i-lucide-refresh-cw" class="size-4 text-white/75" />
              </div>
              <div>
                <p class="text-sm">Exchange Contacts</p>
                <p class="text-xs text-[#8b8b8b]">Direct exchange action</p>
              </div>
            </div>
            <span class="text-[32px] font-bold">{{ exchangeCount }}</span>
          </div>
          <div class="flex items-center justify-between rounded-[4px] bg-[#232323] p-4">
            <div class="flex items-center gap-3">
              <div class="grid size-9 place-items-center rounded-[4px] bg-[#171717]">
                <UIcon name="i-lucide-download" class="size-4 text-white/75" />
              </div>
              <div>
                <p class="text-sm">Add to Contacts</p>
                <p class="text-xs text-[#8b8b8b]">Direct add action</p>
              </div>
            </div>
            <span class="text-[32px] font-bold">{{ vcfCount }}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-center rounded-[8px] bg-[#171717] p-6">
        <AnalyticsDonutChart :data="[exchangeCount, vcfCount]" />
      </div>
    </div>
  </div>
</template>
