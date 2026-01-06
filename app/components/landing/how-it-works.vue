<script setup lang="ts">
const items = [
  {
    title: 'Discover',
    body: 'Schedule a meeting with us and explore what your digital identity could become. In this step, we learn your goals, your style, and the impression you want to leave.Shaping the foundation for a card built uniquely around you.',
  },
  {
    title: 'Design',
    body: 'Work with us to craft your personalized masterpiece.From visual direction to functional details, every choice is intentional. We refine, iterate, and shape a design that reflects your presence with clarity and distinction.',
  },
  {
    title: 'Deliver',
    body: 'Receive your bespoke digital card — polished, optimized, and ready to represent you anywhere. Share it instantly, update it easily, and start making connections that remember who you are.',
  },
];

const { SECTIONS } = inject(LandingContextKey)!;
</script>

<template>
  <section class="py-14 sm:py-30" :id="SECTIONS.HOW_IT_WORKS">
    <div
      class="sm:min-h-auto flex min-h-svh items-center justify-center sm:block sm:py-94"
    >
      <h2
        class="mx-auto mb-18 max-w-[20rem] text-center text-xl font-light uppercase leading-normal tracking-[0.2rem] sm:max-w-160 sm:text-[2.5rem] sm:tracking-[0.3rem]"
      >
        Tailored for You,<br />
        Step by Step
      </h2>
    </div>

    <div id="how-it-works-scroll-container" class="relative h-[400dvh] w-full">
      <div class="sticky top-14 h-[calc(100dvh-3.5rem)] w-full overflow-hidden">
        <div class="flex h-full w-full" id="how-it-works-scroll-wrapper">
          <div
            v-for="(item, index) in items"
            :id="`how-it-works-scroll-item-${index + 1}`"
            class="h-full w-full shrink-0"
          >
            <LandingHowItWorksItem
              :number="index + 1"
              :title="item.title"
              :body="item.body"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
