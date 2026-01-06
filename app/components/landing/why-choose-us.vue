<script setup lang="ts">
const { SECTIONS } = inject(LandingContextKey)!;
</script>

<template>
  <section class="py-14 sm:py-30" :id="SECTIONS.WHY_US">
    <h2
      class="mx-auto mb-6 max-w-[20rem] text-center text-xl font-light uppercase leading-normal tracking-[0.2rem] sm:mb-18 sm:max-w-160 sm:text-[2.5rem] sm:tracking-[0.3rem]"
    >
      Why Choose Us?
    </h2>

    <div
      class="flex flex-col items-stretch justify-center px-4 sm:flex-row sm:px-0"
    >
      <div class="border-white/10 px-14 py-20 sm:border-l">
        <div class="mb-7 aspect-square w-20">
          <IconBespoke />
        </div>
        <h3
          class="mb-3 text-base font-light uppercase leading-normal tracking-[0.2rem]"
        >
          Bespoke Design
        </h3>
        <p class="max-w-58 text-sm font-light leading-normal">
          Your card, your identity, brought to life in 3D.
        </p>
      </div>
      <div
        class="border-t border-white/10 px-14 py-20 sm:border-l sm:border-t-0"
      >
        <div class="mb-7 aspect-square w-20">
          <IconSeamless />
        </div>
        <h3
          class="mb-3 text-base font-light uppercase leading-normal tracking-[0.2rem]"
        >
          Seamless Experience
        </h3>
        <p class="max-w-58 text-sm font-light leading-normal">
          Save contact details with one tap.
        </p>
      </div>
      <div
        class="border-t border-white/10 px-14 py-20 sm:border-l sm:border-t-0"
      >
        <div class="mb-7 aspect-square w-20">
          <IconTimeless />
        </div>
        <h3
          class="mb-3 text-base font-light uppercase leading-normal tracking-[0.2rem]"
        >
          Timeless Elegance
        </h3>
        <p class="max-w-58 text-sm font-light leading-normal">
          A solution that evolves with you.
        </p>
      </div>
    </div>
  </section>
</template>
