<script setup lang="ts">
const { SECTIONS, isHeaderVisible, currentSection } =
  inject(LandingContextKey)!;

const navItems = [
  { label: 'The Masterpieces', id: SECTIONS.MASTERPIECES },
  { label: 'How It Works', id: SECTIONS.HOW_IT_WORKS },
  { label: 'Why Us?', id: SECTIONS.WHY_US },
  { label: 'commission Us', id: SECTIONS.COMMISSION_US },
];

const goToSection = (item: (typeof navItems)[number]) => {
  document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
};
</script>

<template>
  <header class="z-20 bg-dark px-4 sm:px-18">
    <div
      class="flex items-center justify-center border-b border-white/10 py-7 sm:py-13"
    >
      <div class="aspect-[1/0.09] w-32 sm:w-[11.6rem]">
        <IconLogo />
      </div>
    </div>
  </header>

  <nav
    class="sticky top-0 z-20 hidden items-center justify-between bg-dark px-4 sm:flex sm:px-18"
  >
    <button
      v-for="item in navItems"
      @click="goToSection(item)"
      class="cursor-pointer group relative py-6 text-sm font-light uppercase leading-[1.1] tracking-[0.28rem]"
    >
      <AnimatedText :text="item.label" />
      <div
        class="absolute inset-0 top-auto h-px w-full bg-white transition-all duration-1000"
        :class="{
          'scale-x-100': currentSection === item.id,
          'scale-x-0': currentSection !== item.id,
        }"
      ></div>
    </button>
    <div
      class="absolute inset-0 top-auto h-px w-full bg-white/10 transition-all duration-1000"
      :class="{
        'scale-x-100': !isHeaderVisible,
        'scale-x-0': isHeaderVisible,
      }"
    ></div>
  </nav>
</template>
