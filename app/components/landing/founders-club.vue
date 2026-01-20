<script setup lang="ts">
const iconMap: Record<string, any> = {
  access: resolveComponent('IconFounderAccess'),
  card: resolveComponent('IconFounderCard'),
  limited: resolveComponent('IconFounderLimited'),
  pricing: resolveComponent('IconFounderPricing'),
  status: resolveComponent('IconFounderStatus'),
  support: resolveComponent('IconFounderSupport'),
};

const benefits = [
  {
    title: 'Lifetime Founder Status',
    body: 'Recognized forever as one of the first 20 members.',
    icon: 'status',
  },
  {
    title: 'Founder-only Pricing',
    body: 'Lock in special pricing and a lifelong discounted hosting rate.',
    icon: 'pricing',
  },
  {
    title: 'Priority Design & Support',
    body: 'VIP attention, personalized design care, and faster turnaround.',
    icon: 'support',
  },
  {
    title: 'Early Access to Features',
    body: 'Be first to access new updates, tools, and improvements.',
    icon: 'access',
  },
  {
    title: 'Professional & Personal Cards',
    body: 'Get professional card and personal card for multiple usages.',
    icon: 'card',
  },
  {
    title: 'Limited Availability',
    body: 'Strictly capped to ensure quality, focus, and exclusivity.',
    icon: 'limited',
  },
];
</script>

<template>
  <section
    id="founders-club"
    class="overflow-hidden pointer-events-none relative sm:min-h-svh bg-[#151515]"
  >
    <img
      src="/images/founders-club-scene-landing-page.webp"
      alt="Founders Club Invitation"
      class="w-150 aspect-[1/1.69] mx-auto -mt-20"
    />
  </section>

  <section class="py-14 sm:py-30">
    <h2
      class="mx-auto mb-6 max-w-[20rem] text-center text-xl font-light uppercase leading-normal tracking-[0.2rem] sm:mb-18 sm:max-w-160 sm:text-[2.5rem] sm:tracking-[0.3rem]"
    >
      Founders' Benefits
    </h2>

    <div
      class="flex flex-col items-stretch justify-center px-4 sm:flex-row sm:px-0 flex-wrap max-w-300 mx-auto"
    >
      <div v-for="benefit in benefits" class="shrink-0 px-14 py-10">
        <div class="mb-7 bg-white/10 rounded-full p-3 aspect-square w-16 h-16">
          <component :is="iconMap[benefit.icon]" />
        </div>
        <h3
          class="mb-3 text-base font-light uppercase leading-normal tracking-[0.2rem] max-w-64"
        >
          {{ benefit.title }}
        </h3>
        <p class="max-w-54 text-sm font-light leading-normal">
          {{ benefit.body }}
        </p>
      </div>
    </div>
  </section>
</template>
