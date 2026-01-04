<script setup lang="ts">
defineProps<{
  number: string;
  title: string;
  body: string;
}>();
</script>

<template>
  <div class="flex h-full w-full flex-col justify-center">
    <div class="flex w-full items-center gap-2 sm:gap-0">
      <div
        class="flex-1"
        :class="{ 'mask-dots h-10 bg-white/20': number !== '1' }"
      >
        <div
          :id="`how-it-works-line-left-${number}`"
          class="h-full w-0 bg-white"
        ></div>
      </div>
      <div class="relative aspect-square w-14 shrink-0 sm:w-16">
        <svg class="absolute inset-0" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="white"
            stroke-width="2"
            stroke-dasharray="0 1000"
            id="circle-{number}"
          />
        </svg>
        <div
          class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl leading-none sm:text-2xl"
        >
          {{ number }}
        </div>
      </div>
      <div
        class="flex-1"
        :class="{ 'mask-dots h-10 bg-white/20': number !== '3' }"
      >
        <div
          :id="`how-it-works-line-right-${number}`"
          class="h-full w-0 bg-white"
        ></div>
      </div>
    </div>
    <h3
      class="my-10 text-center text-base font-light uppercase leading-normal tracking-[0.2rem] sm:my-14 sm:text-[2rem] sm:tracking-[0.3rem]"
    >
      {{ title }}
    </h3>
    <p
      class="mx-auto {number === '3' ? 'max-w-[18rem]' : 'max-w-84'} text-center text-xs font-light leading-normal tracking-[0.0875rem] sm:max-w-108 sm:text-sm"
    >
      {{ body }}
    </p>
  </div>
</template>
