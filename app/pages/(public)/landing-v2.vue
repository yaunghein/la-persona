<script setup lang="ts">
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Autoplay, FreeMode } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/vue';

useSeoMeta({
  title: 'Meet the right people — LA PERSONA',
  description:
    'La Persona transforms how professionals introduce themselves, connect, and unlock opportunities—starting from a single interaction.',
});

/**
 * Story — scrollytelling: tall track + sticky stage; ScrollTrigger scrub drives word motion
 * (same pattern as index.vue: Lenis + GSAP + ScrollTrigger).
 */
const storyLines = [
  {
    key: 'imagine',
    text: 'Now imagine this.',
    gold: false,
    maxWidth: 'min(100%, 25rem)',
  },
  {
    key: 'meet',
    text: 'You meet someone.',
    gold: false,
    maxWidth: 'min(100%, 25rem)',
  },
  {
    key: 'share',
    text: 'You share your persona instantly.',
    gold: false,
    maxWidth: 'min(100%, 28rem)',
  },
  {
    key: 'understand',
    text: "They immediately understand who you are, what you do, and what you're looking for.",
    gold: false,
    maxWidth: 'min(100%, 40rem)',
  },
  {
    key: 'no-explaining',
    text: 'No explaining. Just a clear, memorable introduction that stays with them.',
    gold: false,
    maxWidth: 'min(100%, 40rem)',
  },
  {
    key: 'closing',
    text: "That's what La Persona makes possible.",
    gold: true,
    maxWidth: 'min(100%, 34rem)',
  },
] as const;

function splitWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

const storyWords = storyLines.map((line) => splitWords(line.text));

/** Extra vertical scroll = more time per narrative beat while the stage is pinned. */
const storyScrollMinVh = computed(() => Math.max(360, storyLines.length * 150));

/** Set on client; when true we skip Lenis + scrub triggers (static layout). */
const prefersReducedMotion = ref(false);

const STORY_WORD_TRAVEL_PX = 28;
/** Within each beat’s scroll segment [0–1]: word stagger-in, full-line hold, stagger-out. */
const STORY_SCRUB_IN_END = 0.52;
const STORY_SCRUB_OUT_START = 0.72;

function smoothScrubStep(t: number) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function wordScrollyMotion(
  scroll01: number,
  beatIndex: number,
  wordIndex: number,
  wordCount: number,
  beatCount: number
): { opacity: number; y: number } {
  const lo = beatIndex / beatCount;
  const hi = (beatIndex + 1) / beatCount;
  if (scroll01 < lo || scroll01 > hi) {
    return { opacity: 0, y: STORY_WORD_TRAVEL_PX };
  }
  const t = (scroll01 - lo) / (hi - lo);
  const W = Math.max(1, wordCount);
  const in0 = (wordIndex / W) * STORY_SCRUB_IN_END;
  const in1 = ((wordIndex + 1) / W) * STORY_SCRUB_IN_END;

  if (t <= in0) {
    return { opacity: 0, y: STORY_WORD_TRAVEL_PX };
  }
  if (t <= in1) {
    const u = (t - in0) / Math.max(1e-6, in1 - in0);
    const s = smoothScrubStep(u);
    return { opacity: s, y: STORY_WORD_TRAVEL_PX * (1 - s) };
  }
  if (t < STORY_SCRUB_OUT_START) {
    return { opacity: 1, y: 0 };
  }
  const out0 =
    STORY_SCRUB_OUT_START + (wordIndex / W) * (1 - STORY_SCRUB_OUT_START);
  const out1 =
    STORY_SCRUB_OUT_START + ((wordIndex + 1) / W) * (1 - STORY_SCRUB_OUT_START);
  if (t <= out0) {
    return { opacity: 1, y: 0 };
  }
  if (t <= out1) {
    const u = (t - out0) / Math.max(1e-6, out1 - out0);
    const s = smoothScrubStep(u);
    return { opacity: 1 - s, y: -STORY_WORD_TRAVEL_PX * 0.48 * s };
  }
  return { opacity: 0, y: -STORY_WORD_TRAVEL_PX * 0.48 };
}

const storyBeatCount = storyLines.length;

let landingV2RafId = 0;
let landingV2Lenis: Lenis | null = null;
const landingV2ScrollTriggers: ScrollTrigger[] = [];
let storyScrollTrigger: ScrollTrigger | undefined;

function applyLandingV2StoryWords(progress01: number) {
  document
    .querySelectorAll<HTMLElement>('.landing-v2-story-word')
    .forEach((el) => {
      const bi = Number(el.dataset.beat);
      const wi = Number(el.dataset.wi);
      if (Number.isNaN(bi) || Number.isNaN(wi)) return;
      const W = Math.max(1, storyWords[bi]?.length ?? 1);
      const { opacity, y } = wordScrollyMotion(
        progress01,
        bi,
        wi,
        W,
        storyBeatCount
      );
      gsap.set(el, { opacity, y, force3D: true });
    });
}

onMounted(async () => {
  if (import.meta.server) return;

  prefersReducedMotion.value = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (prefersReducedMotion.value) {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  landingV2Lenis = new Lenis();

  function raf(time: number) {
    landingV2Lenis?.raf(time);
    ScrollTrigger.update();
    landingV2RafId = requestAnimationFrame(raf);
  }
  landingV2RafId = requestAnimationFrame(raf);

  await nextTick();

  storyScrollTrigger = ScrollTrigger.create({
    id: 'landing-v2-story-scrub',
    trigger: '#landing-v2-story',
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate(self) {
      applyLandingV2StoryWords(self.progress);
    },
  });
  landingV2ScrollTriggers.push(storyScrollTrigger);

  landingV2ScrollTriggers.push(
    ScrollTrigger.create({
      trigger: '#landing-v2-feature-reveal',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.2,
      animation: gsap
        .timeline()
        .to('#landing-v2-reveal-mask', { borderWidth: 0 })
        .to({}, { duration: 0.2 }),
    })
  );

  ScrollTrigger.refresh();
  applyLandingV2StoryWords(storyScrollTrigger.progress);
});

onUnmounted(() => {
  cancelAnimationFrame(landingV2RafId);
  landingV2RafId = 0;
  storyScrollTrigger = undefined;
  landingV2ScrollTriggers.forEach((t) => t.kill());
  landingV2ScrollTriggers.length = 0;
  landingV2Lenis?.destroy();
  landingV2Lenis = null;
});

const changeFeatures = [
  {
    id: 'instant',
    label: 'Instant Exchange',
    description:
      "Instantly exchange contact details through your persona card—so there's no friction, no manual saving, and no lost information after you meet someone.",
  },
  {
    id: 'dynamic',
    label: 'Dynamic Updates',
    description:
      'Refresh your story, links, and focus areas anytime—so every new introduction reflects who you are right now, not last season.',
  },
  {
    id: 'engagement',
    label: 'Engagement Insights',
    description:
      'See how people engage with your persona so you can follow up with context and keep the right conversations moving.',
  },
  {
    id: 'contacts',
    label: 'Contact List',
    description:
      'Keep the people you meet organized in one place—names, context, and next steps without digging through screenshots or paper cards.',
  },
] as const;

const activeFeatureIndex = ref(0);
const activeFeature = computed(() => changeFeatures[activeFeatureIndex.value]!);

const selectFeature = (index: number) => {
  activeFeatureIndex.value = index;
};

const whyItems = [
  {
    title: 'Build relationships',
    body: 'Instead of collecting contacts, you build relationships—people who understand what you do and have a clear reason to stay in touch.',
  },
  {
    title: 'Create opportunities',
    body: 'Instead of missed chances, you create opportunities—because the right people see your value at the moment you meet, not weeks later.',
  },
  {
    title: 'Be remembered',
    body: 'Instead of being forgotten, you become remembered—through a clear, lasting impression that carries beyond the first interaction.',
  },
] as const;

const bespokeCards = [
  {
    name: 'Min Htet Dipar',
    role: 'Creative Director @ The Sand Studio',
  },
  {
    name: 'Matt Nay',
    role: 'F&B Visual Content Creator',
  },
  {
    name: 'Banyar Kyaw Kyaw',
    role: 'IT Support Specialist',
  },
] as const;

/** Repeated for smoother Swiper `loop` + `slidesPerView: 'auto'`. */
const bespokeSwiperSlides = [...bespokeCards, ...bespokeCards, ...bespokeCards];

const bespokeSwiperModules = [FreeMode, Autoplay];

const bespokeSwiperAutoplay = computed(() =>
  prefersReducedMotion.value
    ? false
    : {
        delay: 1,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
      }
);

const freePlanFeatures = [
  'Smart profile creation',
  'Basic discovery',
  'Share via link',
] as const;

const premiumPlanFeatures = [
  'Custom persona card design',
  'Analytics dashboard',
  'Dedicated support',
] as const;
</script>

<template>
  <header
    class="z-30 flex h-30 justify-center items-center border-b border-white/10 bg-dark px-4 sm:px-18"
  >
    <NuxtLink
      to="/"
      class="inline-flex w-32 justify-center sm:w-[11.6rem]"
      aria-label="LA PERSONA home"
    >
      <IconLogo class="aspect-[1/0.09] w-full" />
    </NuxtLink>
  </header>
  <main class="min-h-screen bg-dark text-white">
    <!-- Header: centered logo (Figma); Sign in aligned for product continuity -->

    <!-- Hero -->
    <section
      class="flex flex-col items-center justify-center px-4 py-14 text-center sm:py-60"
    >
      <div class="flex max-w-211.5 flex-col items-center gap-8 sm:gap-13">
        <div class="flex flex-col gap-6 sm:gap-8">
          <h1
            class="mx-auto max-w-[20rem] text-xl font-light uppercase leading-[1.1] tracking-[0.2rem] sm:max-w-none sm:text-[3.5rem] sm:leading-[1.1] sm:tracking-[0.35rem]"
          >
            Meet the right people. At the right time.
          </h1>
          <p
            class="mx-auto max-w-150 text-xs font-light leading-normal tracking-[0.035rem] text-white/50 sm:text-base sm:tracking-[0.056rem]"
          >
            La Persona transforms how professionals introduce themselves,
            connect, and unlock opportunities—starting from a single
            interaction.
          </p>
        </div>
        <div
          class="flex w-full max-w-[23.33rem] flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-4"
        >
          <UButton
            to="/sign-in"
            size="xl"
            class="h-12 justify-center rounded-full bg-white px-10 text-xs font-light uppercase tracking-[0.1rem] text-neutral-950 sm:h-[2.94rem] sm:text-sm sm:tracking-[0.0875rem]"
          >
            Try free
          </UButton>
          <UButton
            to="/landing-v2#what-changes"
            variant="outline"
            size="xl"
            class="h-12 justify-center px-6 rounded-full border-white/10 bg-transparent text-xs font-light uppercase tracking-[0.1rem] text-white sm:h-[2.94rem] sm:text-sm sm:tracking-[0.0875rem]"
          >
            See How It Works
          </UButton>
        </div>
      </div>
    </section>

    <!-- Story: scrollytelling — pinned stage, scroll-scrubbed word waves per line -->
    <section
      id="landing-v2-story"
      class="relative"
      data-scrollytelling
      :style="{ minHeight: `${storyScrollMinVh}vh` }"
      aria-label="La Persona story"
    >
      <!-- Reduced motion: plain stacked copy -->
      <div
        v-if="prefersReducedMotion"
        class="mx-auto max-w-152.5 space-y-24 px-4 py-24 text-center"
      >
        <p
          v-for="line in storyLines"
          :key="line.key"
          class="mx-auto text-xl font-light uppercase leading-normal tracking-[0.15rem] sm:text-[2rem] sm:leading-snug sm:tracking-[0.15rem]"
          :class="line.gold ? 'text-gold' : 'text-white'"
          :style="{ maxWidth: line.maxWidth, width: '100%' }"
        >
          {{ line.text }}
        </p>
      </div>

      <template v-else>
        <div
          class="sticky top-0 z-10 flex min-h-dvh items-center justify-center px-4 py-16 sm:py-24"
        >
          <div class="pointer-events-none relative mx-auto w-full min-h-10">
            <div
              v-for="(line, bi) in storyLines"
              :key="line.key"
              :data-story-key="line.key"
              class="absolute inset-0 flex items-center justify-center"
            >
              <div
                class="flex w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center sm:gap-x-2.5"
                :style="{ maxWidth: line.maxWidth }"
              >
                <span
                  v-for="(word, wi) in storyWords[bi]"
                  :key="`${line.key}-${wi}`"
                  class="landing-v2-story-word inline-block opacity-0 text-xl font-light uppercase leading-snug tracking-[0.15rem] will-change-transform sm:text-[2rem] sm:tracking-[0.15rem]"
                  :class="line.gold ? 'text-gold' : 'text-white'"
                  :data-beat="bi"
                  :data-wi="wi"
                >
                  {{ word }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </section>

    <!-- Product visual: tall track + sticky frame; border scrubs to 0 (motion, like index reveal) -->
    <section
      v-if="prefersReducedMotion"
      aria-label="Product visual"
      class="w-full"
    >
      <div
        class="relative mx-auto aspect-square w-full max-h-[min(100dvh,52.5rem)] max-w-360 sm:aspect-[1/0.58] sm:max-h-none"
      >
        <img
          src="/images/landing-v2/feature-visual.png"
          alt=""
          class="absolute inset-0 h-full w-full object-cover"
          width="2592"
          height="2592"
        />
      </div>
    </section>
    <section v-else aria-label="Product visual" class="w-full">
      <div id="landing-v2-feature-reveal" class="relative h-[200dvh] w-full">
        <div class="sticky top-0 z-0 w-full h-dvh">
          <img
            src="/images/landing-v2/feature-visual.png"
            alt=""
            class="absolute inset-0 h-full w-full object-cover"
            width="2592"
            height="2592"
          />
          <div
            id="landing-v2-reveal-mask"
            class="relative box-border h-full w-full border-solid border-[3.5rem] border-dark sm:border-[7.5rem]"
          ></div>
        </div>
      </div>
    </section>

    <!-- What changes: tabs + phone + copy -->
    <section id="what-changes" class="scroll-mt-24 px-4 py-14 sm:py-24">
      <div
        class="mx-auto flex max-w-360 flex-col items-center gap-12 sm:gap-18"
      >
        <div class="flex flex-col gap-6 text-center sm:gap-8">
          <h2
            class="text-xl font-light uppercase leading-normal tracking-[0.2rem] sm:text-[2rem] sm:tracking-[0.2rem]"
          >
            What Changes With La Persona
          </h2>
          <p
            class="text-xs max-w-110 mx-auto font-light leading-normal tracking-[0.035rem] text-white/50 sm:text-sm sm:tracking-[0.056rem]"
          >
            With La Persona, your professional life starts to shift in small but
            powerful—ways:
          </p>
        </div>

        <div class="relative w-41.5 shrink-0 sm:w-61">
          <img
            src="/images/landing-v2/phone-mockup.png"
            alt=""
            class="h-auto w-full object-contain"
            width="437"
            height="884"
          />
        </div>

        <div
          class="flex w-full max-w-114 flex-col items-center gap-10 sm:max-w-none sm:gap-13"
        >
          <div
            class="flex flex-wrap items-start justify-center gap-x-8 gap-y-4 sm:gap-x-13"
            role="tablist"
            aria-label="Feature highlights"
          >
            <button
              v-for="(f, i) in changeFeatures"
              :key="f.id"
              type="button"
              role="tab"
              :aria-selected="activeFeatureIndex === i"
              class="flex flex-col items-center gap-4 border-none bg-transparent p-0 text-center text-xs font-light uppercase tracking-[0.175rem] sm:text-sm sm:tracking-[0.175rem]"
              :class="
                activeFeatureIndex === i
                  ? 'text-white'
                  : 'text-white/60 hover:text-white/80'
              "
              @click="selectFeature(i)"
            >
              {{ f.label }}
              <span
                class="block h-px w-full max-w-24 origin-center scale-x-0 bg-white/30 sm:max-w-none"
                :class="{ 'scale-x-full!': activeFeatureIndex === i }"
              />
            </button>
          </div>
          <p
            class="max-w-105 text-center text-xs font-light leading-normal tracking-[0.035rem] text-white/50 sm:text-sm sm:tracking-[0.056rem]"
          >
            {{ activeFeature.description }}
          </p>
        </div>
      </div>
    </section>

    <!-- Why La Persona -->
    <section class="px-4 py-14 sm:py-24">
      <h2
        class="mx-auto mb-12 text-center text-xl font-light uppercase leading-normal tracking-[0.2rem] sm:mb-18 sm:max-w-none sm:text-[2rem] sm:tracking-[0.15rem]"
      >
        Why choose La Persona
      </h2>
      <div
        class="mx-auto flex max-w-305.5 flex-col items-stretch sm:flex-row sm:items-center sm:justify-center"
      >
        <template v-for="(item, i) in whyItems" :key="item.title">
          <div
            v-if="i > 0"
            class="hidden h-70 w-px shrink-0 bg-white/10 sm:block"
            aria-hidden="true"
          />
          <div
            class="border-t border-white/10 px-6 py-12 sm:w-[20rem] sm:border-none sm:px-8 sm:py-0"
          >
            <div class="flex flex-col gap-6 sm:gap-8">
              <h3
                class="text-base font-light uppercase leading-normal tracking-[0.125rem] sm:text-xl sm:tracking-[0.125rem]"
              >
                {{ item.title }}
              </h3>
              <p
                class="max-w-[20rem] text-xs font-light leading-normal tracking-[0.0875rem] text-white/40 sm:text-sm"
              >
                {{ item.body }}
              </p>
            </div>
          </div>
        </template>
      </div>
    </section>

    <!-- Bespoke cards: full-bleed Swiper — free mode + autoplay (swiper/vue) -->
    <section id="bespoke-cards" class="py-14 sm:py-24">
      <div
        class="mx-auto flex max-w-305.5 flex-col items-center gap-12 px-4 sm:gap-18"
      >
        <div class="flex flex-col items-center gap-8 text-center sm:gap-13">
          <div class="flex flex-col gap-6 sm:gap-8">
            <h2
              class="text-xl font-light uppercase leading-normal tracking-[0.2rem] sm:text-[2rem] sm:tracking-[0.2rem]"
            >
              Bespoke Persona Cards
            </h2>
            <p
              class="mx-auto max-w-105 text-xs font-light leading-normal tracking-[0.035rem] text-white/50 sm:text-sm sm:tracking-[0.056rem]"
            >
              Explore how professionals present themselves through
              custom-designed cards. Each one crafted to reflect their own
              identity, style, and standard.
            </p>
          </div>
          <NuxtLink
            to="/#commission-us"
            class="inline-flex h-12 items-center justify-center rounded-full border border-white/10 px-10 text-xs font-light uppercase tracking-[0.1rem] hover:bg-white hover:text-dark sm:h-[2.94rem] sm:text-sm sm:tracking-[0.0875rem]"
          >
            Commission us
          </NuxtLink>
        </div>
      </div>

      <div
        class="landing-v2-bespoke-swiper relative w-screen max-w-none overflow-hidden mt-20"
        style="margin-left: calc(50% - 50vw); margin-right: calc(50% - 50vw)"
        data-slider="bespoke-persona-cards"
      >
        <Swiper
          :modules="bespokeSwiperModules"
          slides-per-view="auto"
          :space-between="24"
          :loop="true"
          :loop-additional-slides="2"
          :free-mode="{
            enabled: true,
            minimumVelocity: 0.02,
          }"
          :autoplay="bespokeSwiperAutoplay"
          :speed="12000"
          class="overflow-visible! px-4 sm:px-6"
        >
          <SwiperSlide
            v-for="(card, i) in bespokeSwiperSlides"
            :key="`${card.name}-${i}`"
            class="w-[min(85vw,35.75rem)]! sm:w-143!"
          >
            <article class="select-none">
              <div
                class="mb-6 aspect-[1/0.58] w-full rounded-xl border-2 border-white/10 bg-white/5 sm:mb-8"
              />
              <div class="flex flex-col gap-4">
                <h3
                  class="text-xs font-light uppercase tracking-[0.175rem] sm:text-sm sm:tracking-[0.175rem]"
                >
                  {{ card.name }}
                </h3>
                <p
                  class="max-w-[20rem] text-xs font-light leading-normal tracking-[0.0875rem] text-white/40 sm:text-sm"
                >
                  {{ card.role }}
                </p>
              </div>
            </article>
          </SwiperSlide>
        </Swiper>
      </div>
    </section>

    <!-- Pricing -->
    <section class="px-4 py-14 sm:py-24">
      <div
        class="mx-auto flex max-w-204 flex-col items-center gap-12 sm:gap-18"
      >
        <h2
          class="max-w-133 text-center text-xl font-light uppercase leading-normal tracking-[0.15rem] sm:text-[2rem] sm:leading-snug sm:tracking-[0.15rem]"
        >
          Start free. Upgrade when you're ready.
        </h2>
        <div class="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-6">
          <div
            class="flex flex-col gap-8 rounded-xl border border-white/10 bg-dark p-8 sm:p-10 sm:pb-11"
          >
            <div class="flex flex-col gap-2">
              <p
                class="text-[0.6875rem] font-light uppercase tracking-[0.06875rem] text-gold"
              >
                Free Trial
              </p>
              <p class="text-sm font-medium uppercase tracking-[0.07rem]">
                Standard Persona Card
              </p>
            </div>
            <p
              class="text-[0.8125rem] font-light leading-snug tracking-[0.024rem] text-white/40"
            >
              Explore the platform and start connecting.
            </p>
            <ul class="flex flex-col gap-3">
              <li
                v-for="feat in freePlanFeatures"
                :key="feat"
                class="flex items-center gap-3 text-xs font-light tracking-[0.0225rem] text-white/50"
              >
                <span class="size-1 shrink-0 rounded-full bg-gold" />
                {{ feat }}
              </li>
            </ul>
            <NuxtLink
              to="/sign-in"
              class="mt-auto inline-flex h-12 w-fit items-center justify-center rounded-full border border-white/10 px-8 text-xs font-light uppercase tracking-[0.1rem] hover:bg-white hover:text-dark sm:h-[2.94rem] sm:text-sm sm:tracking-[0.0875rem]"
            >
              Try Free
            </NuxtLink>
          </div>

          <div
            class="relative flex items-start flex-col gap-8 overflow-hidden rounded-xl border border-gold bg-dark p-8 sm:p-10 sm:pb-11"
          >
            <div class="flex flex-col gap-2">
              <p
                class="text-[0.6875rem] font-light uppercase tracking-[0.06875rem] text-gold"
              >
                Premium
              </p>
              <p class="text-sm font-medium uppercase tracking-[0.07rem]">
                Bespoke Persona Card
              </p>
            </div>
            <p
              class="max-w-71.5 text-[0.8125rem] font-light leading-snug tracking-[0.024rem] text-white/40"
            >
              Elevate your presence with a custom-designed persona card.
            </p>
            <ul class="flex flex-col gap-3">
              <li
                v-for="feat in premiumPlanFeatures"
                :key="feat"
                class="flex items-center gap-3 text-xs font-light tracking-[0.0225rem] text-white/50"
              >
                <span class="size-1 shrink-0 rounded-full bg-gold" />
                {{ feat }}
              </li>
            </ul>
            <UButton
              to="/#commission-us"
              size="xl"
              class="mt-auto h-12 justify-center rounded-full bg-white px-8 text-xs font-light uppercase tracking-[0.1rem] text-neutral-950 sm:h-11 sm:text-sm sm:tracking-[0.0875rem]"
            >
              Get Started
            </UButton>
          </div>
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="px-4 py-14 sm:px-58.5 sm:py-24">
      <div
        class="mx-auto flex max-w-127.5 flex-col items-center gap-10 sm:gap-13"
      >
        <p
          class="text-center text-xl font-light uppercase leading-normal tracking-[0.15rem] sm:text-[2rem] sm:leading-snug sm:tracking-[0.15rem]"
        >
          Every meaningful connection starts with a great introduction.
        </p>
        <UButton
          to="/sign-in"
          size="xl"
          class="h-11 justify-center rounded-full bg-white px-10 text-xs font-light uppercase tracking-[0.1rem] text-neutral-950 sm:text-sm sm:tracking-[0.0875rem]"
        >
          Get Started Now
        </UButton>
      </div>
    </section>

    <!-- Footer -->
  </main>
  <footer class="border-t border-white/10 px-4 py-10 sm:px-12 sm:pt-12">
    <div
      class="mx-auto flex max-w-360 flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"
    >
      <nav
        class="flex flex-wrap items-center gap-6 text-[0.75rem] font-light uppercase tracking-[0.075rem] text-white/40"
        aria-label="Footer"
      >
        <a href="#" class="hover:text-white">Contact</a>
        <a href="#" class="hover:text-white">Terms</a>
        <a href="#" class="hover:text-white">Privacy</a>
      </nav>
      <p
        class="text-[0.6875rem] font-light uppercase tracking-[0.06875rem] text-white/30"
      >
        © la persona. All rights reserved.
      </p>
    </div>
  </footer>
</template>
