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
import type { EventDetailOverview } from '~~/shared/contracts/event';

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

const chartColors = useChartColors();

const chartData = computed(() => ({
  labels: props.data.registrationTrend.labels,
  datasets: [
    {
      label: 'Registrations',
      data: props.data.registrationTrend.values,
      borderColor: chartColors.value.ink,
      backgroundColor: 'transparent',
      tension: 0.35,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: chartColors.value.ink,
      borderWidth: 2,
    },
  ],
}));

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      grid: { color: chartColors.value.grid, borderDash: [4, 4] },
      ticks: { color: chartColors.value.tick, font: { size: 12 } },
      border: { display: false },
    },
    y: {
      beginAtZero: true,
      max: 160,
      ticks: {
        color: chartColors.value.tick,
        font: { size: 12 },
        stepSize: 40,
      },
      grid: { color: chartColors.value.grid, borderDash: [4, 4] },
      border: { display: false },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      displayColors: false,
      backgroundColor: chartColors.value.tooltipBackground,
      borderColor: chartColors.value.tooltipBorder,
      borderWidth: 1,
      titleColor: chartColors.value.ink,
      bodyColor: chartColors.value.ink,
      padding: 10,
      callbacks: {
        label: (ctx: { parsed?: { y?: number } }) =>
          `Registrations: ${ctx?.parsed?.y ?? 0}`,
      },
    },
  },
}));
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-4">
    <div class="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="metric in metrics"
        :key="metric.label"
        class="flex min-h-27 flex-col justify-between rounded-lg bg-surface p-6"
      >
        <p class="text-xs font-medium uppercase tracking-[1.2px] text-subtle">
          {{ metric.label }}
        </p>
        <p class="text-[2rem] font-bold leading-[1.2] text-ink">
          {{ metric.value }}
        </p>
      </div>
    </div>

    <div class="flex min-h-0 w-full flex-1 flex-col rounded-lg bg-surface p-6">
      <h2
        class="shrink-0 text-xl font-medium tracking-[0.125rem] uppercase text-ink"
      >
        Registration Trend
      </h2>
      <div class="relative mt-6 min-h-62.5 flex-1">
        <Line
          class="absolute inset-0 size-full"
          :data="chartData"
          :options="chartOptions as any"
        />
      </div>
    </div>
  </div>
</template>
