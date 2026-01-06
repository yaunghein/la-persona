<script setup lang="ts">
import { Application } from '@splinetool/runtime';

const loading = ref(false);

onMounted(async () => {
  const timerId = setTimeout(() => (loading.value = true), 500);
  const canvas = document.querySelector('canvas') as HTMLCanvasElement;
  const spline = new Application(canvas);
  spline
    .load('https://prod.spline.design/RLMffXoyzfSZ0XE3/scene.splinecode')
    .then(() => {
      clearTimeout(timerId);
      loading.value = false;
    });
});
</script>

<template>
  <section
    class="flex min-h-120 h-[calc(100svh-4.25rem)] flex-col justify-between pb-7 pt-14 sm:h-[calc(100dvh-11.25rem)] sm:pb-0 sm:pt-0"
  >
    <h1
      class="pointer-events-none relative z-10 mx-auto max-w-[20rem] text-center text-xl font-light uppercase leading-[1.1] tracking-[0.2rem] my-auto sm:max-w-3xl sm:text-[2.5rem] sm:tracking-[0.3rem]"
    >
      Elevate Your Presence with a Bespoke Digital Experience
    </h1>

    <div
      class="pointer-events-none inset-0 -ml-[8%] h-full min-h-150 w-[120%] translate-y-7 scale-75 sm:pointer-events-auto sm:absolute sm:ml-0 sm:w-full sm:translate-y-20"
    >
      <USkeleton
        v-if="loading"
        class="h-full w-full absolute inset-0 scale-y-32 scale-x-40 -translate-y-12 rounded-none"
      />
      <canvas class="h-full w-full opacity-50"></canvas>
    </div>

    <div
      class="relative z-20 mb-0 flex flex-col items-center justify-center gap-3 sm:mb-13 sm:flex-row sm:gap-5"
    >
      <a
        href="/"
        class="group w-60 rounded-full border border-white/10 py-4 text-xs font-light uppercase leading-none tracking-[0.1rem] transition-all duration-500 hover:bg-white hover:text-dark sm:w-[19.05rem] sm:text-sm"
      >
        <AnimatedText text="explore our craft" />
      </a>
      <a
        href="#commission-us"
        class="group w-60 rounded-full border border-white/10 py-4 text-xs font-light uppercase leading-none tracking-[0.1rem] transition-all duration-500 hover:bg-white hover:text-dark sm:w-[19.05rem] sm:text-sm"
      >
        <AnimatedText text="commission your card" />
      </a>
    </div>
  </section>
</template>
