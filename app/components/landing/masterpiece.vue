<script setup lang="ts">
const masterpieces = [
  { image: '/images/iPhone 13-1.webp', alt: 'Demo 1' },
  { image: '/images/iPhone 13-2.webp', alt: 'Demo 2' },
  { image: '/images/iPhone 13-3.webp', alt: 'Demo 3' },
];

const { SECTIONS } = inject(LandingContextKey)!;
</script>

<template>
  <section class="py-14 sm:py-30" :id="SECTIONS.MASTERPIECES">
    <h2
      class="mx-auto mb-18 max-w-[20rem] text-center text-xl font-light uppercase leading-normal tracking-[0.2rem] sm:max-w-160 sm:text-[2.5rem] sm:tracking-[0.3rem]"
    >
      Every Card, <br />a Masterpiece
    </h2>
    <p
      class="mx-auto mb-24 max-w-[18rem] text-center text-sm font-light leading-normal sm:max-w-[18rem]"
    >
      Experience the elegance of a card tailored to your identity. From the
      sleek phone wallpaper to the interactive 3D design, each element reflects
      your brand with precision and style.
    </p>
    <div class="hidden items-center justify-center gap-20 sm:flex">
      <img
        v-for="masterpiece in masterpieces"
        :src="masterpiece.image"
        :alt="masterpiece.alt"
        class="aspect-[1/2.02] w-61"
      />
    </div>
    <img
      :src="masterpieces[1]!.image"
      :alt="masterpieces[1]!.alt"
      class="mx-auto aspect-[1/2.02] w-61 sm:hidden"
    />
  </section>
</template>
