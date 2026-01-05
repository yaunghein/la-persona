<script setup lang="ts">
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const SECTIONS = {
  MASTERPIECES: 'masterpieces',
  HOW_IT_WORKS: 'how-it-works',
  WHY_US: 'why-us',
  COMMISSION_US: 'commission-us',
};

const isHeaderVisible = ref(true);

onMounted(async () => {
  const lenis = new Lenis();
  gsap.registerPlugin(ScrollTrigger);

  function raf(time: number) {
    lenis.raf(time);
    ScrollTrigger.update();
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // header visibility check to animate the line below navigation
  ScrollTrigger.create({
    trigger: 'header',
    start: 'top top',
    end: 'bottom top',
    onEnter: () => (isHeaderVisible.value = true),
    onLeave: () => (isHeaderVisible.value = false),
    onEnterBack: () => (isHeaderVisible.value = true),
  });
});

const landingContext: LandingContext = {
  SECTIONS,
  isHeaderVisible,
};
provide(LandingContextKey, landingContext);
</script>

<template>
  <LandingNavbar />
  <LandingHero />
  <LandingMasterpiece />
</template>
