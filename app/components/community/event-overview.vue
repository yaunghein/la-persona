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
  <div class="flex min-h-0 flex-1 flex-col gap-4">
    <div class="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="metric in metrics"
        :key="metric.label"
        class="flex min-h-27 flex-col justify-between rounded-lg bg-[#171717] p-6"
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

    <div
      class="flex min-h-0 w-full flex-1 flex-col rounded-lg bg-[#171717] p-6"
    >
      <h2
        class="shrink-0 text-xl font-medium tracking-[0.125rem] uppercase text-white"
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
