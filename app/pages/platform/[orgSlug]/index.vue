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
import {
  OTHER_LINK_LABELS,
  SOCIAL_MEDIA_LINK_LABELS,
} from '~~/shared/constants/card-link-options';

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
  socialConfiguredLabels: string[];
  otherConfiguredLabels: string[];
  totalStats: { type: string; count: number }[];
  dailyViews: { date: string; count: number }[];
  socialClicks: { platform: string; count: number }[];
  linkClicks: { label: string; count: number }[];
  saveActions: { action: string; count: number }[];
}

const { data: session } = await authClient.useSession(useFetch);
const selectedCardId = ref('all');
const isInfoOpen = ref(false);
const hasSeenInfoPopup = useLocalStorage(
  `lp-info-popup:analytics:${session.value?.user.id || 'anonymous'}`,
  false
);

onMounted(() => {
  if (hasSeenInfoPopup.value) return;
  isInfoOpen.value = true;
  hasSeenInfoPopup.value = true;
});

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
const infoItems = [
  {
    icon: 'i-lucide-eye',
    title: 'Track Total Views',
    description: 'Monitor how often your cards are being opened.',
  },
  {
    icon: 'i-lucide-share-2',
    title: 'Measure Click Behavior',
    description:
      'See social and link click-through performance for your audience.',
  },
  {
    icon: 'i-lucide-refresh-cw',
    title: 'Review Save Actions',
    description: 'Understand how users exchange contacts or save your details.',
  },
  {
    icon: 'i-lucide-filter',
    title: 'Filter by Card',
    description:
      'Owners can switch between all cards or a single card for focused insights.',
  },
];

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
const socialLabelSet = new Set(
  SOCIAL_MEDIA_LINK_LABELS.map((label) => label.toLowerCase())
);
const otherLabelSet = new Set(
  OTHER_LINK_LABELS.map((label) => label.toLowerCase())
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
const hasDonutData = computed(
  () => exchangeCount.value > 0 || vcfCount.value > 0
);

const socialCountMap = computed(() => {
  const map = new Map<string, number>();
  for (const item of stats.value?.socialClicks || []) {
    const key = (item.platform || '').trim().toLowerCase();
    map.set(key, (map.get(key) || 0) + item.count);
  }
  // Backward compatibility: old events may have been tracked as link_click.
  for (const item of stats.value?.linkClicks || []) {
    const key = (item.label || '').trim().toLowerCase();
    if (!socialLabelSet.has(key)) continue;
    map.set(key, (map.get(key) || 0) + item.count);
  }
  return map;
});
const socialImageMap: Record<string, string> = {
  facebook: '/images/card/facebook.png',
  github: '/images/card/github.png',
  gmail: '/images/card/gmail.png',
  instagram: '/images/card/instagram.png',
  line: '/images/card/line.png',
  linkedin: '/images/card/linkedin.png',
  telegram: '/images/card/telegram.png',
  tiktok: '/images/card/tiktok.png',
  whatsapp: '/images/card/whatsapp.png',
};
const socialRows = computed(() =>
  (stats.value?.socialConfiguredLabels || []).map((label) => {
    const key = label.toLowerCase();
    return {
      platform: label,
      image: socialImageMap[key] || '',
      count: socialCountMap.value.get(key) || 0,
    };
  })
);

const linkCountMap = computed(() => {
  const map = new Map<string, number>();
  for (const item of stats.value?.linkClicks || []) {
    const key = (item.label || '').trim().toLowerCase();
    map.set(key, (map.get(key) || 0) + item.count);
  }
  // Backward compatibility: old events may have been tracked as social_click.
  for (const item of stats.value?.socialClicks || []) {
    const key = (item.platform || '').trim().toLowerCase();
    if (!otherLabelSet.has(key)) continue;
    map.set(key, (map.get(key) || 0) + item.count);
  }
  return map;
});
const linkRows = computed(() =>
  (stats.value?.otherConfiguredLabels || []).map((label) => ({
    label,
    count: linkCountMap.value.get(label.toLowerCase()) || 0,
  }))
);
const hasSocialRows = computed(() => socialRows.value.length > 0);
const hasLinkRows = computed(() => linkRows.value.length > 0);

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
      pointHoverRadius: 4,
      pointHitRadius: 24,
      pointHoverBackgroundColor: '#ffffff',
      pointHoverBorderColor: '#ffffff',
      pointHoverBorderWidth: 0,
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
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
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      displayColors: false,
      backgroundColor: '#171717',
      borderColor: '#2a2a2a',
      borderWidth: 1,
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      padding: 10,
      callbacks: {
        label: (ctx: any) => `Views: ${ctx?.parsed?.y ?? 0}`,
      },
    },
  },
};
</script>

<template>
  <div class="space-y-4">
    <div
      class="flex flex-col sm:flex-row gap-3 sm:gap-0 items-center justify-between"
    >
      <h1
        class="flex items-center gap-3 text-3xl leading-[1.1] font-medium uppercase tracking-widest"
      >
        {{ analyticsHeading }}
        <UButton
          icon="material-symbols:info-outline"
          color="neutral"
          variant="ghost"
          class="size-6 flex items-center justify-center rounded-full p-0 text-muted hover:bg-[#232323] cursor-pointer"
          aria-label="Open analytics information"
          @click="isInfoOpen = true"
        />
      </h1>

      <USelectMenu
        v-if="isOwner"
        v-model="selectedCardId"
        value-key="id"
        :items="ownerCardItems"
        :search-input="false"
        class="w-full sm:w-48"
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
        <div
          class="mb-4 grid size-11 place-items-center rounded-[4px] bg-[#232323]"
        >
          <UIcon name="i-lucide-eye" class="size-5 text-white/70" />
        </div>
        <p
          class="text-xs font-medium uppercase tracking-[1.2px] text-[#8b8b8b]"
        >
          Total Views
        </p>
        <p class="mt-1 text-3xl font-bold leading-[1.1] text-white">
          {{ totalViews }}
        </p>
      </div>
      <div class="rounded-[8px] bg-[#171717] px-6 pt-6 pb-7">
        <div
          class="mb-4 grid size-11 place-items-center rounded-[4px] bg-[#232323]"
        >
          <UIcon name="i-lucide-download" class="size-5 text-white/70" />
        </div>
        <p
          class="text-xs font-medium uppercase tracking-[1.2px] text-[#8b8b8b]"
        >
          Card Saves (CTR)
        </p>
        <p class="mt-1 text-3xl font-bold leading-[1.1] text-white">
          {{ cardSaves }}
        </p>
      </div>
      <div class="rounded-[8px] bg-[#171717] px-6 pt-6 pb-7">
        <div
          class="mb-4 grid size-11 place-items-center rounded-[4px] bg-[#232323]"
        >
          <UIcon name="i-lucide-percent" class="size-5 text-white/70" />
        </div>
        <p
          class="text-xs font-medium uppercase tracking-[1.2px] text-[#8b8b8b]"
        >
          Conversion Rate
        </p>
        <p class="mt-1 text-3xl font-bold leading-[1.1] text-white">
          {{ conversionRate }}%
        </p>
      </div>
      <div class="rounded-[8px] bg-[#171717] px-6 pt-6 pb-7">
        <div
          class="mb-4 grid size-11 place-items-center rounded-[4px] bg-[#232323]"
        >
          <UIcon name="i-lucide-share-2" class="size-5 text-white/70" />
        </div>
        <p
          class="text-xs font-medium uppercase tracking-[1.2px] text-[#8b8b8b]"
        >
          Social Clicks
        </p>
        <p class="mt-1 text-3xl font-bold leading-[1.1] text-white">
          {{ socialTotal }}
        </p>
      </div>
    </div>

    <div class="rounded-[8px] bg-[#171717] p-6">
      <h2 class="text-3xl leading-[1.1] font-medium uppercase tracking-[2px]">
        Views Over Time
      </h2>
      <p class="mt-1 text-sm text-[#8b8b8b]">
        Daily card opens for the past 7 days
      </p>
      <div class="mt-4 h-60">
        <Line :data="chartData" :options="chartOptions" />
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div class="rounded-[8px] bg-[#171717] p-6">
        <h3 class="text-3xl leading-[1.1] font-medium uppercase tracking-[2px]">
          Social Media Click-Throughs
        </h3>
        <p class="mt-1 text-sm text-[#8b8b8b]">
          Which platforms are driving engagement
        </p>
        <div v-if="hasSocialRows" class="mt-6 space-y-2">
          <div
            v-for="row in socialRows"
            :key="row.platform"
            class="flex items-center justify-between rounded-[4px] bg-[#232323] px-3 py-2"
          >
            <div class="flex items-center gap-2 text-sm">
              <img
                v-if="row.image"
                :src="row.image"
                :alt="`${row.platform} icon`"
                class="size-4 object-contain"
              />
              <UIcon v-else name="i-lucide-globe" class="size-4 text-white" />
              <span>{{ row.platform }}</span>
            </div>
            <span class="text-sm font-medium">{{ row.count }}</span>
          </div>
        </div>
        <div
          v-else
          class="mt-6 flex min-h-38 flex-col items-center justify-center gap-2 rounded-[4px] bg-[#232323] text-center"
        >
          <UIcon
            name="i-lucide-mouse-pointer-click"
            class="size-5 text-white/70"
          />
          <p class="text-sm text-[#8b8b8b]">No social links configured.</p>
        </div>
      </div>

      <div class="rounded-[8px] bg-[#171717] p-6">
        <h3 class="text-3xl leading-[1.1] font-medium uppercase tracking-[2px]">
          Portfolio & Link Clicks
        </h3>
        <p class="mt-1 text-sm text-[#8b8b8b]">
          External URL engagement tracking
        </p>
        <div v-if="hasLinkRows" class="mt-6 space-y-2">
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
        <div
          v-else
          class="mt-6 flex min-h-38 flex-col items-center justify-center gap-2 text-center"
        >
          <UIcon name="i-lucide-link-2" class="size-5 text-white/70" />
          <p class="text-sm text-[#8b8b8b]">No links configured yet.</p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div class="rounded-[8px] bg-[#171717] p-6">
        <h3 class="text-3xl leading-[1.1] font-medium uppercase tracking-[2px]">
          Card Save Actions
        </h3>
        <p class="mt-1 text-sm text-[#8b8b8b]">
          Breakdown of how users saved your card
        </p>
        <div class="mt-6 space-y-3">
          <div
            class="flex items-center justify-between rounded-[4px] bg-[#232323] p-4"
          >
            <div class="flex items-center gap-3">
              <div
                class="grid size-9 place-items-center rounded-[4px] bg-[#171717]"
              >
                <UIcon
                  name="i-lucide-refresh-cw"
                  class="size-4 text-white/75"
                />
              </div>
              <div>
                <p class="text-sm">Exchange Contacts</p>
                <p class="text-xs text-[#8b8b8b]">Direct exchange action</p>
              </div>
            </div>
            <span class="text-3xl leading-[1.1] font-bold">{{
              exchangeCount
            }}</span>
          </div>
          <div
            class="flex items-center justify-between rounded-[4px] bg-[#232323] p-4"
          >
            <div class="flex items-center gap-3">
              <div
                class="grid size-9 place-items-center rounded-[4px] bg-[#171717]"
              >
                <UIcon name="i-lucide-download" class="size-4 text-white/75" />
              </div>
              <div>
                <p class="text-sm">Add to Contacts</p>
                <p class="text-xs text-[#8b8b8b]">Direct add action</p>
              </div>
            </div>
            <span class="text-3xl leading-[1.1] font-bold">{{ vcfCount }}</span>
          </div>
        </div>
      </div>

      <div
        v-if="hasDonutData"
        class="flex items-center justify-center rounded-[8px] bg-[#171717] p-6"
      >
        <AnalyticsDonutChart :data="[exchangeCount, vcfCount]" />
      </div>
    </div>
  </div>

  <UModal
    v-model:open="isInfoOpen"
    :close="false"
    :ui="{
      content:
        'max-w-[480px] rounded-[8px] border border-[#232323] bg-[#171717]',
      body: 'p-0',
    }"
  >
    <template #content>
      <div class="overflow-hidden rounded-[8px] bg-[#171717]">
        <div
          class="flex items-center justify-between border-b-2 border-[#232323] px-6 pb-[26px] pt-6"
        >
          <h2 class="text-sm font-medium uppercase tracking-widest text-white">
            What is analytics?
          </h2>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            class="size-6 flex items-center justify-center rounded-full p-0 text-white hover:bg-[#232323]"
            aria-label="Close info"
            @click="isInfoOpen = false"
          />
        </div>
        <div class="p-6">
          <div class="space-y-8">
            <div class="space-y-4">
              <h3
                class="text-[20px] font-medium leading-[27px] uppercase tracking-widest text-white"
              >
                Understand your card performance
              </h3>
              <p class="text-sm leading-[21px] text-[#8b8b8b]">
                Use these insights to learn what drives engagement.
              </p>
            </div>

            <div class="space-y-0">
              <div
                v-for="(item, index) in infoItems"
                :key="item.title"
                class="px-4 py-3"
                :class="
                  index < infoItems.length - 1
                    ? 'border-b border-[#2a2a2a]'
                    : ''
                "
              >
                <div class="flex items-start gap-2">
                  <UIcon :name="item.icon" class="mt-0.5 size-5 text-white" />
                  <div>
                    <p class="text-[14px] text-white">{{ item.title }}</p>
                    <p class="mt-2 text-[14px] text-[#8b8b8b]">
                      {{ item.description }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex justify-end">
              <UButton
                label="Understood"
                color="neutral"
                class="rounded-full bg-white px-6 text-dark hover:bg-white/90"
                @click="isInfoOpen = false"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
