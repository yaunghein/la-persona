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
import { lineChartOptions, lineSeries } from '~/utils/line-chart';

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
  { label: 'Connections Made', value: props.data.connectionsMade },
]);

const chartColors = useChartColors();
const yAxis = computed(() =>
  wholeNumberYAxis(props.data.registrationTrend.values)
);

const chartData = computed(() => ({
  labels: props.data.registrationTrend.labels,
  datasets: [
    lineSeries(chartColors.value, props.data.registrationTrend.values, {
      label: 'Registrations',
    }),
  ],
}));

const chartOptions = computed(() =>
  lineChartOptions(chartColors.value, {
    y: yAxis.value,
    tooltipLabel: (value) => `Registrations: ${value}`,
  })
);
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-4">
    <div
      class="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
    >
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
