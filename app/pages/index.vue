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

  ScrollTrigger.create({
    trigger: '#how-it-works-scroll-container',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1.2,
    animation: gsap
      .timeline()
      .to('#circle-1', { strokeDasharray: '283 0', duration: 1 }, 0)
      .to('#how-it-works-line-right-1', { width: '100%', duration: 2 })
      .to(
        '#how-it-works-scroll-wrapper',
        {
          x: () => {
            const wrapper = document.getElementById(
              'how-it-works-scroll-wrapper'
            );
            return -(wrapper!.scrollWidth - window.innerWidth);
          },
          ease: 'none',
          duration: 8,
        },
        '<50%'
      )
      .to('#how-it-works-line-left-2', { width: '100%', duration: 2 }, 3)
      .to('#circle-2', { strokeDasharray: '283 0', duration: 1 }, 5)
      .to('#how-it-works-line-right-2', { width: '100%', duration: 2 }, 6)
      .to('#how-it-works-line-left-3', { width: '100%', duration: 2 }, 8)
      .to('#circle-3', { strokeDasharray: '283 0', duration: 1 }, 10)
      .to({}, { duration: 0.75 }),
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
  <LandingHowItWorks />
</template>
