<script setup lang="ts">
import { Application } from '@splinetool/runtime';

const canvasRef = ref<HTMLCanvasElement | null>(null);

const route = useRoute();
const { cardId } = route.params;
const { data: card, pending, error } = await useFetch(`/api/cards/${cardId}`);
const firstName = computed(() => card.value?.name?.split(' ')[0] ?? '');
const lastName = computed(
  () => card.value?.name?.split(' ').slice(1).join(' ') ?? ''
);

onMounted(async () => {
  if (!canvasRef.value || !card.value || !card.value.splineUrl) return;
  const spline = new Application(canvasRef.value);
  await spline.load(card.value.splineUrl).then(() => {
    spline.setVariables({
      firstName: firstName.value,
      lastName: lastName.value,
    });
  });
});

const isFormOpen = ref(false);
</script>

<template>
  <div class="min-h-dvh w-full">
    <canvas ref="canvasRef" class="absolute inset-0 w-full h-full"></canvas>
    <UButton
      label="Exchange Contact"
      size="lg"
      @click="isFormOpen = !isFormOpen"
      class="absolute z-50 bottom-20 left-1/2 -translate-x-1/2"
    />
  </div>

  <div
    v-if="isFormOpen && card"
    class="absolute inset-0 w-full h-full bg-black/80 grid place-items-center"
  >
    <div>
      <ExchangeForm :card @submitted="isFormOpen = false" />
    </div>
  </div>
</template>
