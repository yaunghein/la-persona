<script setup lang="ts">
const { SECTIONS, isHeaderVisible } = inject(LandingContextKey)!;

const navItems = [
  { label: 'The Masterpieces', href: `#${SECTIONS.MASTERPIECES}` },
  { label: 'How It Works', href: `#${SECTIONS.HOW_IT_WORKS}` },
  { label: 'Why Us?', href: `#${SECTIONS.WHY_US}` },
  { label: 'commission Us', href: `#${SECTIONS.COMMISSION_US}` },
];
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
    <a
      v-for="item in navItems"
      :href="item.href"
      class="group relative py-6 text-sm font-light uppercase leading-[1.1] tracking-[0.28rem]"
    >
      <AnimatedText :text="item.label" />
      <div
        class="absolute inset-0 top-auto h-px w-full bg-white transition-all duration-1000"
        :class="{
          'scale-x-100': `currentSection` === item.href.split('#')[1],
          'scale-x-0': `currentSection` !== item.href.split('#')[1],
        }"
      ></div>
    </a>
    <div
      class="absolute inset-0 top-auto h-px w-full bg-white/10 transition-all duration-1000"
      :class="{
        'scale-x-100': !isHeaderVisible,
        'scale-x-0': isHeaderVisible,
      }"
    ></div>
  </nav>
</template>
