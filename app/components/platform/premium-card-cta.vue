<script setup lang="ts">
import { Application } from '@splinetool/runtime';

const BESPOKE_SPLINE_URL =
  'https://prod.spline.design/PUnUYVF6idyub0GP/scene.splinecode';

const PREMIUM_CARD_URL =
  'https://m.me/61571393589144?text=Hello%20I%20want%20to%20know%20more';

const canvasEl = ref<HTMLCanvasElement | null>(null);
let splineApp: Application | null = null;
let disposed = false;

onMounted(async () => {
  await nextTick();
  const canvas = canvasEl.value;
  if (!import.meta.client || !canvas) return;

  const app = new Application(canvas);
  splineApp = app;

  try {
    await app.load(BESPOKE_SPLINE_URL);
    if (disposed) {
      app.dispose();
      return;
    }
    // app.setBackgroundColor('#171717');
    // app.setZoom(3.2);
  } catch {
    if (!disposed) app.dispose();
    splineApp = null;
  }
});

onUnmounted(() => {
  disposed = true;
  splineApp?.dispose();
  splineApp = null;
});
</script>

<template>
  <div class="flex h-full min-h-88 self-stretch overflow-hidden">
    <div
      class="flex w-full flex-1 flex-col items-center justify-between rounded-lg border-2 border-[#232323] bg-[#171717] py-5"
    >
      <p
        class="max-w-72 text-center text-xl font-normal leading-normal tracking-[0.125rem] text-white uppercase"
      >
        Want your own persona card with
        <span class="font-bold">custom design</span>?
      </p>

      <div class="relative min-h-36 w-full flex-1 overflow-hidden">
        <div
          class="absolute top-1/2 left-1/2 size-[220%] -translate-x-1/2 -translate-y-1/2"
        >
          <canvas
            ref="canvasEl"
            class="absolute inset-0 size-full"
            aria-hidden="true"
          />
        </div>
      </div>

      <UButton
        label="Get Our Premium Card"
        :to="PREMIUM_CARD_URL"
        target="_blank"
        color="neutral"
        class="h-12 shrink-0 justify-center rounded-full bg-white px-8 text-sm font-medium text-dark hover:bg-white/90"
      />
    </div>
  </div>
</template>
