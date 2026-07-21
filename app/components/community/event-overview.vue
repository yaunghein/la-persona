<script setup lang="ts">
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
import type { EventDetailOverview } from '~~/shared/types/community-event-detail';

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
  data: EventDetailOverview;
}>();

const metrics = computed(() => [
  { label: 'Registrations', value: props.data.registrations },
  { label: 'Checked-In', value: props.data.checkedIn },
  { label: 'Attendance Rate', value: props.data.attendanceRate },
  { label: 'New Members Joined', value: props.data.newMembersJoined },
]);

const dateTimeLines = computed(() =>
  props.data.dateTime
    .split(/\n|, (?=\d{1,2}:)/)
    .map((line) => line.trim())
    .filter(Boolean)
);

const chartData = computed(() => ({
  labels: props.data.registrationTrend.labels,
  datasets: [
    {
      label: 'Registrations',
      data: props.data.registrationTrend.values,
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
      grid: { color: 'rgba(255,255,255,0.06)', borderDash: [4, 4] },
      ticks: { color: '#8b8b8b', font: { size: 12 } },
      border: { display: false },
    },
    y: {
      beginAtZero: true,
      max: 160,
      ticks: {
        color: '#8b8b8b',
        font: { size: 12 },
        stepSize: 40,
      },
      grid: { color: 'rgba(255,255,255,0.06)', borderDash: [4, 4] },
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
        label: (ctx: { parsed?: { y?: number } }) =>
          `Registrations: ${ctx?.parsed?.y ?? 0}`,
      },
    },
  },
} as const;
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Top: details (left) + 2x2 metrics (right) -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-stretch">
      <div
        class="flex w-full flex-col gap-6 rounded-lg bg-[#171717] p-6 lg:w-[23.666rem] lg:shrink-0"
      >
        <div class="flex flex-col gap-1">
          <p
            class="text-xs font-medium uppercase tracking-[1.2px] text-[#8b8b8b]"
          >
            Date &amp; Time
          </p>
          <p class="text-sm leading-normal font-medium text-white">
            <template v-if="dateTimeLines.length > 1">
              <span
                v-for="(line, index) in dateTimeLines"
                :key="index"
                class="block"
              >
                {{ line }}
              </span>
            </template>
            <template v-else>
              {{ data.dateTime }}
            </template>
          </p>
        </div>

        <div class="h-px w-full bg-[#232323]" />

        <div class="flex flex-col gap-1">
          <p
            class="text-xs font-medium uppercase tracking-[1.2px] text-[#8b8b8b]"
          >
            Place
          </p>
          <p class="text-sm leading-normal font-medium text-white">
            {{ data.place }}
          </p>
        </div>

        <div class="h-px w-full bg-[#232323]" />

        <div class="flex flex-col gap-1">
          <p
            class="text-xs font-medium uppercase tracking-[1.2px] text-[#8b8b8b]"
          >
            Registration status
          </p>
          <div class="pt-2">
            <span
              class="inline-flex items-center gap-2 rounded-[4px] bg-[#232323] p-2.5 text-[0.625rem] font-bold tracking-wide uppercase"
              :class="
                data.registrationStatus === 'open'
                  ? 'text-[#8bf667]'
                  : 'text-[#8b8b8b]'
              "
            >
              <span
                class="size-1.5 shrink-0 rounded-full"
                :class="
                  data.registrationStatus === 'open'
                    ? 'bg-[#8bf667]'
                    : 'bg-[#8b8b8b]'
                "
                aria-hidden="true"
              />
              {{ data.registrationStatus === 'open' ? 'Open' : 'Closed' }}
            </span>
          </div>
        </div>
      </div>

      <div class="grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
        <div
          v-for="metric in metrics"
          :key="metric.label"
          class="flex min-h-32 flex-col justify-between rounded-lg bg-[#171717] p-6"
        >
          <p
            class="text-xs font-medium uppercase tracking-[1.2px] text-[#8b8b8b]"
          >
            {{ metric.label }}
          </p>
          <p class="text-[2rem] font-bold leading-[1.2] text-white">
            {{ metric.value }}
          </p>
        </div>
      </div>
    </div>

    <!-- Bottom: full-width registration trend -->
    <div class="w-full rounded-lg bg-[#171717] p-6">
      <h2
        class="text-xl font-medium tracking-[0.125rem] uppercase text-white"
      >
        Registration Trend
      </h2>
      <div class="mt-6 h-62.5">
        <Line :data="chartData" :options="chartOptions as any" />
      </div>
    </div>
  </div>
</template>
