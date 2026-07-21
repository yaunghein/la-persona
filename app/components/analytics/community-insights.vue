<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';
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
import type {
  CommunityEventPerformance,
  CommunityInsightsData,
} from '~~/shared/types/community-insights';

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale
);

const props = defineProps<{
  data: CommunityInsightsData;
}>();

const selectedPeriod = defineModel<string>('period', { default: '7d' });
const isInfoOpen = ref(false);

function openInfo() {
  isInfoOpen.value = true;
}

function closeInfo() {
  isInfoOpen.value = false;
}

const chartData = computed(() => ({
  labels: props.data.memberGrowth.labels,
  datasets: [
    {
      label: 'Members',
      data: props.data.memberGrowth.values,
      borderColor: '#ffffff',
      backgroundColor: 'transparent',
      tension: 0.35,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: '#ffffff',
      borderWidth: 2,
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.06)' },
      ticks: { color: '#8b8b8b', font: { size: 11 } },
      border: { display: false },
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(255,255,255,0.06)' },
      ticks: { color: '#8b8b8b', font: { size: 11 } },
      border: { display: false },
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
        label: (ctx: any) => `Members: ${ctx?.parsed?.y ?? 0}`,
      },
    },
  },
} as const;

const columns: TableColumn<CommunityEventPerformance>[] = [
  { accessorKey: 'event', header: 'EVENT' },
  { accessorKey: 'registered', header: 'REGISTERED' },
  { accessorKey: 'checkedIn', header: 'CHECKED IN' },
  { accessorKey: 'attendance', header: 'ATTENDANCE' },
];
</script>

<template>
  <div class="space-y-4 pb-17 sm:pb-0">
    <div
      class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-2">
        <h1
          class="text-xl font-medium leading-tight tracking-widest uppercase sm:text-[1.75rem]"
        >
          {{ data.title }}
        </h1>
        <UButton
          size="lg"
          icon="i-material-symbols:info-outline"
          color="neutral"
          variant="ghost"
          class="flex cursor-pointer items-center justify-center rounded-full p-0 text-muted hover:bg-[#232323]"
          aria-label="Open community insights information"
          @click="openInfo"
        />
      </div>

      <USelectMenu
        v-model="selectedPeriod"
        value-key="value"
        :items="data.periodOptions"
        :search-input="false"
        class="w-auto min-w-36 sm:w-40"
        :ui="{
          base: 'h-12 rounded-lg border-none bg-[#171717] px-6 text-white',
          content: 'bg-[#171717] border border-[#2a2a2a]',
          item: 'text-white data-[highlighted]:bg-[#232323]',
          value: 'text-white',
        }"
      />
    </div>

    <div class="grid grid-cols-2 gap-4 md:grid-cols-3">
      <div
        v-for="metric in data.metrics"
        :key="metric.label"
        class="rounded-lg bg-[#171717] p-4 sm:p-6"
      >
        <p
          class="text-xs font-medium uppercase tracking-[1.2px] text-[#8b8b8b]"
        >
          {{ metric.label }}
        </p>
        <p class="mt-1 text-3xl font-bold leading-[1.2] text-white">
          {{ metric.value }}
        </p>
      </div>
    </div>

    <div class="rounded-lg bg-[#171717] p-4 sm:p-6">
      <h2
        class="text-xl font-medium leading-tight tracking-widest uppercase sm:text-2xl"
      >
        Member Growth
      </h2>
      <div class="mt-6 h-60">
        <Line :data="chartData" :options="chartOptions as any" />
      </div>
    </div>

    <div class="rounded-lg bg-[#171717] p-4 sm:p-6">
      <h2
        class="mb-6 text-xl font-medium leading-tight tracking-widest uppercase sm:text-2xl"
      >
        Event Performance Overview
      </h2>
      <div class="overflow-x-auto">
        <UTable
          :data="data.eventPerformance"
          :columns="columns"
          :ui="{
            th: 'px-6 py-5 border-b border-[#232323] text-xs font-semibold tracking-wide uppercase text-white',
            td: 'px-6 py-5 border-b border-[#232323] text-sm',
            tr: 'bg-transparent',
            empty: 'py-12 text-center text-sm text-muted',
          }"
          class="w-full min-w-150"
        >
          <template #event-cell="{ row }">
            <span class="font-medium text-white">{{ row.original.event }}</span>
          </template>
          <template #registered-cell="{ row }">
            <span class="text-[#8b8b8b]">{{ row.original.registered }}</span>
          </template>
          <template #checkedIn-cell="{ row }">
            <span class="text-[#8b8b8b]">{{ row.original.checkedIn }}</span>
          </template>
          <template #attendance-cell="{ row }">
            <span class="font-medium text-white">{{
              row.original.attendance
            }}</span>
          </template>
        </UTable>
      </div>
    </div>
  </div>

  <UModal
    v-model:open="isInfoOpen"
    title="What is community insights?"
    :ui="{
      content:
        'sm:max-w-[480px] rounded-lg border border-[#232323] bg-[#171717]',
      title: 'text-sm font-medium uppercase tracking-widest text-white',
      body: 'px-5 py-4 sm:px-6 sm:py-5',
    }"
  >
    <template #body>
      <div class="space-y-5 sm:space-y-6">
        <div class="space-y-2">
          <h3
            class="text-lg font-medium leading-tight tracking-widest uppercase text-white sm:text-xl"
          >
            Understand your community
          </h3>
          <p class="text-sm leading-relaxed text-[#8b8b8b]">
            Track membership growth, event turnout, and engagement across your
            organization.
          </p>
        </div>

        <div class="space-y-0">
          <div
            v-for="(item, index) in data.infoItems"
            :key="item.title"
            class="py-3 sm:py-3.5"
            :class="
              index < data.infoItems.length - 1
                ? 'border-b border-[#2a2a2a]'
                : ''
            "
          >
            <div class="flex items-start gap-3">
              <UIcon
                :name="item.icon"
                class="mt-0.5 size-4.5 shrink-0 text-white sm:size-5"
              />
              <div class="min-w-0">
                <p class="text-sm font-medium text-white">{{ item.title }}</p>
                <p class="mt-1.5 text-sm leading-relaxed text-[#8b8b8b]">
                  {{ item.description }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end">
          <UButton
            size="md"
            label="Understood"
            color="neutral"
            class="h-10 justify-center rounded-full bg-white px-5 font-medium text-dark hover:bg-white/90"
            @click="closeInfo"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
