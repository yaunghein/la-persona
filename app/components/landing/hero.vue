<script setup lang="ts">
import { Application } from '@splinetool/runtime';

const loading = ref(false);

onMounted(async () => {
  const timerId = setTimeout(() => (loading.value = true), 500);
  const canvas = document.querySelector('#demo-card') as HTMLCanvasElement;
  const spline = new Application(canvas);
  spline
    .load('https://prod.spline.design/ZEuYzbIAFVDYpUrb/scene.splinecode')
    .then(() => {
      clearTimeout(timerId);
      loading.value = false;
    });
});

const navItems = [
  { label: 'The Masterpieces', id: SECTIONS.MASTERPIECES },
  { label: 'How It Works', id: SECTIONS.HOW_IT_WORKS },
  { label: 'Why Us?', id: SECTIONS.WHY_US },
  { label: 'founders club', id: SECTIONS.FOUNDERS_CLUB },
];

const goToSection = (item: (typeof navItems)[number]) => {
  document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
};
</script>

<template>
  <section
    class="relative flex flex-col sm:justify-between pb-7 pt-20 sm:pb-0 sm:pt-40"
  >
    <h1
      class="pointer-events-none mb-10 relative z-10 mx-auto max-w-[20rem] text-center text-xl font-light uppercase leading-[1.1] tracking-[0.2rem] sm:my-auto sm:max-w-3xl sm:text-[2.5rem] sm:tracking-[0.3rem]"
    >
      Elevate Your Presence with a Bespoke Digital Experience
    </h1>

    <div
      class="pointer-events-none sm:pointer-events-auto absolute inset-0 w-full h-full"
    >
      <!-- <USkeleton
        v-if="loading"
        class="h-full w-full absolute inset-0 scale-y-32 scale-x-40 -translate-y-12 rounded-none"
      /> -->
      <canvas
        id="demo-card"
        class="h-full w-full translate-y-42 sm:translate-y-58"
      ></canvas>
    </div>

    <div
      class="relative z-20 sm:mt-16 mb-64 flex flex-col items-center justify-center gap-3 sm:mb-125 sm:flex-row sm:gap-5"
    >
      <a
        href="https://www.la-persona.com/minhtetmyet"
        class="group w-60 rounded-full border border-white/10 py-4 text-xs font-light uppercase leading-none tracking-[0.1rem] transition-all duration-500 hover:bg-white hover:text-dark sm:w-[19.05rem] sm:text-sm"
      >
        <AnimatedText text="see demo" />
      </a>
      <button
        @click="goToSection(navItems[3]!)"
        class="cursor-pointer group w-60 rounded-full border border-white/10 py-4 text-xs font-light uppercase leading-none tracking-[0.1rem] transition-all duration-500 hover:bg-white hover:text-dark sm:w-[19.05rem] sm:text-sm"
      >
        <AnimatedText text="limited offer" />
      </button>
    </div>
  </section>
</template>
