<script setup lang="ts">
import { Doughnut } from 'vue-chartjs';
const props = defineProps<{ data: number[] }>();

const chartColors = useChartColors();

const chartData = computed(() => ({
  labels: ['Exchange', 'Add'],
  datasets: [
    {
      data: props.data,
      backgroundColor: [chartColors.value.ink, chartColors.value.secondary],
      borderWidth: 0,
      hoverOffset: 4,
    },
  ],
}));

const options = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: { legend: { display: false } },
};
</script>

<template>
  <div class="h-[220px] w-[220px]">
    <Doughnut :data="chartData" :options="options" />
  </div>
</template>
