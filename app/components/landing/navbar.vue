<script setup lang="ts">
const { isHeaderVisible, currentSection } = inject(LandingContextKey)!;
</script>

<template>
  <header class="z-30 bg-dark px-4 sm:px-18">
    <div
      class="flex items-center justify-between border-b border-white/10 py-5 sm:py-10"
    >
      <div class="aspect-[1/0.09] w-32 sm:w-[11.6rem]">
        <IconLogo />
      </div>
      <UButton
        to="/sign-in"
        color="primary"
        class="rounded-full font-semibold"
        size="lg"
        icon="material-symbols:person"
      >
        Sign In
      </UButton>
    </div>
  </header>

  <nav
    class="sticky top-0 z-30 hidden items-center justify-between bg-dark px-4 sm:flex sm:px-18"
  >
    <button
      v-for="item in LANDING_NAV_LINKS.filter(
        (link) => link.label !== 'Commision Us'
      )"
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
