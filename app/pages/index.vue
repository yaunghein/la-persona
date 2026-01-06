<script setup lang="ts">
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const isHeaderVisible = ref(true);
const currentSection = ref<currentSectionType>(null);

onMounted(async () => {
  const lenis = new Lenis();
  gsap.registerPlugin(ScrollTrigger);

  function raf(time: number) {
    lenis.raf(time);
    ScrollTrigger.update();
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // check header visibility and animate below whole navigation line
  ScrollTrigger.create({
    trigger: 'header',
    start: 'top top',
    end: 'bottom top',
    onEnter: () => (isHeaderVisible.value = true),
    onLeave: () => (isHeaderVisible.value = false),
    onEnterBack: () => (isHeaderVisible.value = true),
  });

  // check sections visibility and animate navbar item line
  const sections = Object.values(SECTIONS)
    .map((id) => {
      const element = document.getElementById(id);
      return element as HTMLDivElement;
    })
    .filter(Boolean) as HTMLDivElement[];
  sections.forEach((section, index) => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 50%',
      end: 'bottom 50%',
      onEnter: () => (currentSection.value = section.id as currentSectionType),
      onLeave: () => (currentSection.value = null),
      onEnterBack: () =>
        (currentSection.value = section.id as currentSectionType),
      onLeaveBack: () => index === 0 && (currentSection.value = null),
    });
  });

  // animate how it works horizontal items
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

  // reveal image on scroll
  ScrollTrigger.create({
    trigger: '#reveal-container',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1.2,
    animation: gsap
      .timeline()
      .to('#reveal-mask', { borderWidth: 0 })
      .to({}, { duration: 0.2 }),
  });
});

const landingContext: LandingContext = {
  SECTIONS,
  isHeaderVisible,
  currentSection,
};
provide(LandingContextKey, landingContext);
</script>

<template>
  <LandingNavbar />
  <LandingHero />
  <LandingMasterpiece />
  <LandingHowItWorks />
  <LandingReveal />
  <LandingWhyChooseUs />
</template>
