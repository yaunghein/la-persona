<script setup lang="ts">
import { Doughnut } from 'vue-chartjs';
const props = defineProps<{ data: number[] }>();

const chartData = computed(() => ({
  labels: ['Exchange', 'Add'],
  datasets: [
    {
      data: props.data,
      backgroundColor: ['#ffffff', 'rgba(255, 255, 255, 0.1)'],
      borderWidth: 0,
      hoverOffset: 4,
    },
  ],
}));

const options = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '75%',
  plugins: { legend: { display: false } },
};
</script>

<template>
  <div class="w-48 h-48">
    <Doughnut :data="chartData" :options="options" />
  </div>
</template>
