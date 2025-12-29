<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

import { Application } from '@splinetool/runtime';

const canvasRef = ref<HTMLCanvasElement | null>(null);

const route = useRoute();
const { cardId } = route.params;
const { data: card, pending, error } = await useFetch(`/api/cards/${cardId}`);
const firstName = computed(() => card.value?.name?.split(' ')[0] ?? '');
const lastName = computed(
  () => card.value?.name?.split(' ').slice(1).join(' ') ?? ''
);

let spline: Application;

onMounted(async () => {
  if (!canvasRef.value || !card.value || !card.value.splineUrl) return;
  spline = new Application(canvasRef.value);
  await spline.load(card.value.splineUrl).then(() => {
    spline.setVariables({
      firstName: firstName.value,
      lastName: lastName.value,
    });
  });
});

const isFormOpen = ref(false);

const updateSpline = (firstName: string, lastName: string) => {
  spline?.setVariables({ firstName, lastName });
};
</script>

<template>
  <div class="w-full flex h-[calc(100dvh-7rem)]">
    <div class="w-1/2 h-full">
      <canvas ref="canvasRef" class="w-full h-full overflow-hidden"></canvas>
    </div>
    <div class="w-1/2 flex-1 flex items-center justify-center">
      <EditForm
        v-if="card"
        :card
        @submitted="isFormOpen = false"
        @name-changed="updateSpline"
      />
    </div>
  </div>
</template>
