<script setup lang="ts">
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Application } from '@splinetool/runtime';

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
    text: 'You share your persona card instantly.',
    gold: false,
    maxWidth: 'min(100%, 30rem)',
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
const floatingCtaEl = ref<HTMLElement | null>(null);

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

  if (floatingCtaEl.value) {
    gsap.set(floatingCtaEl.value, { autoAlpha: 0, y: 16 });

    const showCta = () =>
      gsap.to(floatingCtaEl.value, {
        autoAlpha: 1,
        y: 0,
        duration: 0.3,
        ease: 'power2.out',
      });
    const hideCta = () =>
      gsap.to(floatingCtaEl.value, {
        autoAlpha: 0,
        y: 16,
        duration: 0.2,
        ease: 'power2.in',
      });

    landingV2ScrollTriggers.push(
      ScrollTrigger.create({
        trigger: '#landing-v2-hero',
        start: 'bottom center',
        onEnter: showCta,
        onLeaveBack: hideCta,
      }),
      ScrollTrigger.create({
        trigger: '#landing-v2-final-cta',
        start: 'top bottom+=700',
        onEnter: hideCta,
        onLeaveBack: showCta,
      })
    );
  }

  landingV2ScrollTriggers.push(
    ScrollTrigger.create({
      trigger: 'header',
      start: 'top top',
      end: 'bottom top',
      onEnter: () => (isHeaderVisible.value = true),
      onLeave: () => (isHeaderVisible.value = false),
      onEnterBack: () => (isHeaderVisible.value = true),
    })
  );

  const v2SectionIds = Object.values(V2_SECTIONS);
  v2SectionIds.forEach((id, index) => {
    const el = document.getElementById(id);
    if (!el) return;
    landingV2ScrollTriggers.push(
      ScrollTrigger.create({
        trigger: el,
        start: 'top 50%',
        end: 'bottom 50%',
        onEnter: () => (currentSection.value = id),
        onLeave: () => (currentSection.value = null),
        onEnterBack: () => (currentSection.value = id),
        onLeaveBack: () => index === 0 && (currentSection.value = null),
      })
    );
  });

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
    video: '/videos/instant-exchange-demo.mp4',
    duration: 25000,
  },
  {
    id: 'dynamic',
    label: 'Dynamic Updates',
    description:
      'Update your persona anytime, so your information is always current without reprinting cards, and you’ll never worry about running out when it matters most.',
    video: '/videos/dynamic-update-demo.mp4',
    duration: 24000,
  },
  {
    id: 'engagement',
    label: 'Engagement Insights',
    description:
      'See how many people viewed and engaged with your persona card, giving you a clear signal of interest, so you can follow up with intention instead of guessing.',
    video: '/videos/insights-demo.mp4',
    duration: 8000,
  },
  {
    id: 'contacts',
    label: 'Contact List',
    description:
      'Every person you connect with is automatically saved, so you can easily revisit, manage, and follow up without losing track of important contacts.',
    video: '/videos/contacts-demo.mp4',
    duration: 19000,
  },
] as const;
const FEATURE_FADE_MS = 1200;
const activeFeatureIndex = ref(0);
const activeFeature = computed(() => changeFeatures[activeFeatureIndex.value]!);
const featureProgress = ref(0);
let featureTimerId: ReturnType<typeof setInterval> | null = null;
let featureProgressRafId = 0;
let featureTickStart = 0;

function startFeatureTimer() {
  stopFeatureTimer();
  const ms = changeFeatures[activeFeatureIndex.value]!.duration;
  featureTickStart = performance.now();
  featureProgress.value = 0;

  featureProgressRafId = requestAnimationFrame(function tick(now) {
    const elapsed = now - featureTickStart;
    featureProgress.value = Math.min(1, elapsed / ms);
    if (elapsed < ms) {
      featureProgressRafId = requestAnimationFrame(tick);
    }
  });

  featureTimerId = setTimeout(() => {
    activeFeatureIndex.value =
      (activeFeatureIndex.value + 1) % changeFeatures.length;
    startFeatureTimer();
  }, ms);
}

function stopFeatureTimer() {
  if (featureTimerId) {
    clearTimeout(featureTimerId);
    featureTimerId = null;
  }
  cancelAnimationFrame(featureProgressRafId);
  featureProgressRafId = 0;
}

const featureVideosEl = ref<HTMLElement | null>(null);
const featureTablistEl = ref<HTMLElement | null>(null);

function syncFeatureVideos(activeIndex: number) {
  if (!featureVideosEl.value) return;
  const videos = featureVideosEl.value.querySelectorAll('video');
  videos.forEach((video, i) => {
    if (i === activeIndex) {
      video.currentTime = 0;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });
}

function selectFeature(index: number) {
  activeFeatureIndex.value = index;
  syncFeatureVideos(index);
  startFeatureTimer();
}

watch(activeFeatureIndex, (index) => {
  syncFeatureVideos(index);
  nextTick(() => {
    const container = featureTablistEl.value;
    if (!container) return;
    const btn = container.children[index] as HTMLElement | undefined;
    if (!btn) return;
    const scrollLeft =
      btn.offsetLeft - container.clientWidth / 2 + btn.offsetWidth / 2;
    container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
  });
});

onMounted(async () => {
  await nextTick();
  syncFeatureVideos(0);
  startFeatureTimer();

  if (bespokeCanvasEl.value) {
    const spline = new Application(bespokeCanvasEl.value);
    spline.load(BESPOKE_SPLINE_URL);
  }
});

onUnmounted(() => {
  stopFeatureTimer();
});

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

const BESPOKE_SPLINE_URL =
  'https://prod.spline.design/PUnUYVF6idyub0GP/scene.splinecode';
const bespokeCanvasEl = ref<HTMLCanvasElement | null>(null);

const V2_SECTIONS = {
  FEATURES: 'features',
  WHY_LA_PERSONA: 'why-la-persona',
  BESPOKE_CARDS: 'bespoke-cards',
  PRICING: 'pricing',
} as const;
type V2Section = (typeof V2_SECTIONS)[keyof typeof V2_SECTIONS] | null;

const V2_NAV_LINKS = [
  { label: 'Features', id: V2_SECTIONS.FEATURES },
  { label: 'Why La Persona', id: V2_SECTIONS.WHY_LA_PERSONA },
  { label: 'Bespoke Cards', id: V2_SECTIONS.BESPOKE_CARDS },
  { label: 'Pricing', id: V2_SECTIONS.PRICING },
] as const;

const isHeaderVisible = ref(true);
const currentSection = ref<V2Section>(null);

function goToV2Section(item: (typeof V2_NAV_LINKS)[number]) {
  document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
}

const freePlanFeatures = [
  'Create and share your persona card with our professionally designed template',
  'Instant contact exchange',
  'Access your contact list',
  'See engagement insights (total view, card saves, social clicks, etc)',
] as const;

const premiumPlanFeatures = [
  'Everything in Standard',
  'Fully custom-designed persona card',
  'Priority support and updates',
] as const;
</script>

<template>
  <header
    class="z-30 flex h-15 sm:h-30 justify-center items-center border-b border-white/10 bg-dark px-4 sm:px-18"
  >
    <NuxtLink
      to="/"
      class="inline-flex w-32 justify-center sm:w-[11.6rem]"
      aria-label="LA PERSONA home"
    >
      <IconLogo class="aspect-[1/0.09] w-full" />
    </NuxtLink>
  </header>

  <nav
    class="sticky top-0 z-30 hidden items-center justify-between bg-dark px-4 sm:flex sm:px-18"
  >
    <button
      v-for="item in V2_NAV_LINKS"
      :key="item.id"
      @click="goToV2Section(item)"
      class="cursor-pointer relative py-6 text-sm font-light uppercase leading-[1.1] tracking-[0.28rem] transition-colors duration-300"
      :class="
        currentSection === item.id
          ? 'text-white'
          : 'text-white/40 hover:text-white/70'
      "
    >
      {{ item.label }}
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

  <main class="min-h-screen bg-dark text-white">
    <!-- Header: centered logo (Figma); Sign in aligned for product continuity -->

    <!-- Hero -->
    <section
      id="landing-v2-hero"
      class="flex flex-col items-center justify-center text-center"
    >
      <div
        class="flex max-w-211.5 flex-col items-center gap-8 sm:gap-13 py-18 sm:py-24"
      >
        <div class="flex flex-col gap-4 sm:gap-8">
          <h1
            class="mx-auto max-w-[20rem] text-xl font-light uppercase leading-[1.1] tracking-[0.2rem] sm:max-w-none sm:text-[3.5rem] sm:leading-[1.1] sm:tracking-[0.35rem]"
          >
            Meet the right people. At the right time.
          </h1>
          <p
            class="mx-auto max-w-80 sm:max-w-140 text-xs font-light leading-normal tracking-[0.04rem] text-white/50 sm:text-base"
          >
            La Persona transforms how professionals introduce themselves,
            connect, and unlock opportunities—starting from a single
            interaction.
          </p>
        </div>
        <div
          class="flex sm:w-full max-w-[23.33rem] flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-4"
        >
          <UButton
            to="/sign-in"
            size="xl"
            class="h-10 sm:h-12 justify-center rounded-full bg-white px-10 text-xs font-light uppercase tracking-[0.1rem] text-neutral-950 sm:text-sm sm:tracking-[0.0875rem]"
          >
            Try free
          </UButton>
          <UButton
            to="/landing-v2#features"
            variant="outline"
            size="xl"
            class="h-10 sm:h-12 justify-center px-6 rounded-full border-white/10 bg-transparent text-xs font-light uppercase tracking-[0.1rem] text-white sm:text-sm sm:tracking-[0.0875rem]"
          >
            See How It Works
          </UButton>
        </div>
      </div>

      <div class="w-full max-w-7xl">
        <img
          src="/images/landing-v2/hero-visual-mobile.webp"
          alt="La Persona platform preview"
          class="block h-auto w-full sm:hidden -mt-8"
        />
        <img
          src="/images/landing-v2/hero-visual-desktop.webp"
          alt="La Persona platform preview"
          class="hidden h-auto w-full sm:block px-4 sm:pl-10"
        />
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
        <div
          class="sticky top-0 sm:top-16 z-0 w-full h-dvh sm:h-[calc(100dvh-4rem)]"
        >
          <img
            src="/images/landing-v2/feature-visual.png"
            alt=""
            class="absolute inset-0 h-full w-full object-cover"
            width="2592"
            height="2592"
          />
          <div
            id="landing-v2-reveal-mask"
            class="relative box-border h-full w-full border-solid border-[5.5rem] border-dark sm:border-[12rem]"
          ></div>
        </div>
      </div>
    </section>

    <!-- What changes: tabs + phone + copy -->
    <section id="features" class="scroll-mt-16 py-14 sm:py-24">
      <div
        class="mx-auto flex max-w-360 flex-col items-center gap-12 sm:gap-18"
      >
        <div class="flex flex-col gap-2 text-center sm:gap-8">
          <h2
            class="text-xl max-w-68 sm:max-w-none font-light uppercase leading-normal tracking-[0.2rem] sm:text-[2rem] sm:tracking-[0.2rem]"
          >
            What Changes With La Persona
          </h2>
          <p
            class="text-xs max-w-68 sm:max-w-110 mx-auto font-light leading-normal tracking-[0.035rem] text-white/50 sm:text-sm sm:tracking-[0.056rem]"
          >
            With La Persona, your professional life starts to shift in small but
            powerful—ways:
          </p>
        </div>

        <div class="relative w-41.5 shrink-0 sm:w-61">
          <div class="relative">
            <div
              ref="featureVideosEl"
              class="absolute inset-[2.3%_5.4%_2.3%_5.4%] z-0 overflow-hidden rounded-[11%/5.5%]"
            >
              <video
                v-for="(f, i) in changeFeatures"
                :key="f.id"
                :src="f.video"
                muted
                playsinline
                class="absolute inset-0 h-full w-full object-cover transition-opacity"
                :class="activeFeatureIndex === i ? 'opacity-100' : 'opacity-0'"
                :style="{ transitionDuration: `${FEATURE_FADE_MS}ms` }"
              />
            </div>
            <img
              src="/images/landing-v2/iphone-frame.webp"
              alt=""
              class="relative z-10 h-auto w-full"
            />
          </div>
        </div>

        <div
          class="flex w-full flex-col items-center gap-10 sm:max-w-none sm:gap-13 overflow-hidden"
        >
          <div
            ref="featureTablistEl"
            class="flex items-start justify-start sm:justify-center gap-x-13 w-full overflow-x-auto hide-scrollbar px-4"
            role="tablist"
            aria-label="Feature highlights"
          >
            <button
              v-for="(f, i) in changeFeatures"
              :key="f.id"
              type="button"
              role="tab"
              :aria-selected="activeFeatureIndex === i"
              class="shrink-0 flex flex-col items-center gap-2 border-none bg-transparent p-0 text-center text-xs font-light uppercase tracking-[0.175rem] sm:text-sm sm:tracking-[0.175rem]"
              :class="
                activeFeatureIndex === i
                  ? 'text-white'
                  : 'text-white/60 hover:text-white/80'
              "
              @click="selectFeature(i)"
            >
              {{ f.label }}
              <span
                class="block h-px w-full origin-left bg-white"
                :style="{
                  transform:
                    activeFeatureIndex === i
                      ? `scaleX(${featureProgress})`
                      : 'scaleX(0)',
                }"
              />
            </button>
          </div>
          <div class="relative sm:max-w-105 max-w-80">
            <p
              v-for="(f, i) in changeFeatures"
              :key="f.id"
              class="text-center text-xs font-light leading-normal tracking-[0.035rem] text-white/50 sm:text-sm sm:tracking-[0.056rem] transition-opacity"
              :class="[
                activeFeatureIndex === i ? 'opacity-100' : 'opacity-0',
                i === 0 ? 'relative' : 'absolute inset-0',
              ]"
              :style="{ transitionDuration: `${FEATURE_FADE_MS}ms` }"
            >
              {{ f.description }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Why La Persona -->
    <section id="why-la-persona" class="px-4 py-14 sm:py-24">
      <div
        class="mx-auto flex max-w-305 flex-col items-center gap-12 sm:gap-18"
      >
        <h2
          class="text-center text-xl font-light uppercase leading-normal tracking-[0.15rem] sm:text-[2rem] sm:tracking-[0.15rem]"
        >
          Why choose La Persona
        </h2>
        <div
          class="flex w-full flex-col items-stretch sm:flex-row sm:items-center"
        >
          <template v-for="(item, i) in whyItems" :key="item.title">
            <div
              class="hidden w-px shrink-0 self-stretch bg-white/10 sm:block"
              aria-hidden="true"
            />
            <div
              class="flex flex-1 flex-col gap-6 px-4 py-10 sm:gap-8 sm:border-none sm:px-13 sm:py-16"
              :class="i > 0 ? 'border-t border-white/10' : ''"
            >
              <h3
                class="text-base font-light uppercase leading-normal tracking-[0.125rem] sm:text-xl sm:tracking-[0.125rem]"
              >
                {{ item.title }}
              </h3>
              <p
                class="max-w-80 text-xs font-light leading-normal tracking-[0.0875rem] text-white/40 sm:text-sm sm:tracking-[0.0875rem]"
              >
                {{ item.body }}
              </p>
            </div>
          </template>
        </div>
      </div>
    </section>

    <!-- Bespoke cards: full-page Spline scene -->
    <section id="bespoke-cards" class="py-14 sm:py-24">
      <div
        class="mx-auto flex max-w-305.5 flex-col items-center gap-12 px-4 sm:gap-18 relative z-10"
      >
        <div class="flex flex-col items-center gap-8 text-center sm:gap-13">
          <div class="flex flex-col gap-2 sm:gap-8">
            <h2
              class="text-xl font-light uppercase leading-normal tracking-[0.2rem] sm:text-[2rem] sm:tracking-[0.2rem]"
            >
              Bespoke Persona Cards
            </h2>
            <p
              class="max-w-76 sm:max-w-105 mx-auto text-xs font-light leading-normal tracking-[0.035rem] text-white/50 sm:text-sm sm:tracking-[0.056rem]"
            >
              Explore how professionals present themselves through
              custom-designed cards. Each one crafted to reflect their own
              identity, style, and standard.
            </p>
          </div>
          <NuxtLink
            to="https://m.me/61571393589144?text=Hello%20I%20want%20to%20know%20more"
            target="_blank"
            class="inline-flex h-10 sm:h-12 items-center justify-center rounded-full border border-white/10 px-10 text-xs font-light uppercase tracking-[0.1rem] hover:bg-white hover:text-dark sm:text-sm sm:tracking-[0.0875rem]"
          >
            Talk to Us
          </NuxtLink>
        </div>
      </div>

      <div
        class="relative w-screen max-w-none overflow-hidden aspect-square sm:aspect-[1/0.58] sm:max-h-dvh -mt-20 sm:-mt-48 -mb-20 sm:-mb-56"
        style="margin-left: calc(50% - 50vw); margin-right: calc(50% - 50vw)"
      >
        <canvas
          ref="bespokeCanvasEl"
          class="absolute inset-0 h-full w-full pointer-events-none sm:pointer-events-auto"
        />
      </div>
    </section>

    <!-- Pricing -->
    <section id="pricing" class="px-4 py-14 sm:py-24 relative z-10">
      <div
        class="mx-auto flex max-w-196 flex-col items-center gap-12 sm:gap-18"
      >
        <h2
          class="max-w-133 text-center text-xl font-light uppercase leading-snug tracking-[0.15rem] sm:text-[2rem] sm:tracking-[0.15rem]"
        >
          Start free. Upgrade when you're ready.
        </h2>
        <div class="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
          <div
            class="flex flex-col gap-4 rounded-xl border border-white/10 bg-dark p-8 sm:p-10"
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
            <ul
              class="list-disc space-y-1 pl-5 text-[0.8125rem] font-light leading-snug tracking-[0.024rem] text-white/40"
            >
              <li v-for="feat in freePlanFeatures" :key="feat">
                {{ feat }}
              </li>
            </ul>
            <NuxtLink
              to="/sign-in"
              class="mt-5 inline-flex h-10 sm:h-12 w-fit items-center justify-center rounded-full border border-white/10 px-8 text-xs font-light uppercase tracking-[0.1rem] hover:bg-white hover:text-dark sm:text-sm sm:tracking-[0.0875rem]"
            >
              Try Free
            </NuxtLink>
          </div>

          <div
            class="flex flex-col justify-between gap-4 rounded-xl border border-gold bg-dark p-8 sm:p-10"
          >
            <div class="flex flex-col gap-4">
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
                class="text-[0.8125rem] font-light leading-snug tracking-[0.024rem] text-white/40"
              >
                Elevate your presence with a custom-designed persona card.
              </p>
              <ul
                class="list-disc space-y-1 pl-5 text-[0.8125rem] font-light leading-snug tracking-[0.024rem] text-white/40"
              >
                <li v-for="feat in premiumPlanFeatures" :key="feat">
                  {{ feat }}
                </li>
              </ul>
            </div>
            <UButton
              to="https://m.me/61571393589144?text=Hello%20I%20want%20to%20know%20more"
              target="_blank"
              size="xl"
              class="h-10 sm:h-12 w-fit justify-center rounded-full bg-white px-8 text-xs font-light uppercase tracking-[0.1rem] text-neutral-950 sm:text-sm sm:tracking-[0.0875rem]"
            >
              Talk to Us
            </UButton>
          </div>
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section id="landing-v2-final-cta" class="px-4 py-20 sm:px-58.5 sm:py-33">
      <div
        class="mx-auto flex max-w-127.5 flex-col items-center gap-10 sm:gap-13"
      >
        <p
          class="max-w-80 text-center text-xl font-light uppercase leading-snug tracking-[0.15rem] sm:max-w-127.5 sm:text-[2rem] sm:tracking-[0.15rem]"
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

    <!-- Floating CTA -->
    <div
      ref="floatingCtaEl"
      class="fixed bottom-[5vh] left-1/2 z-50 -translate-x-1/2 invisible"
    >
      <UButton
        to="/sign-in"
        size="xl"
        class="h-10 sm:h-12 rounded-full bg-white px-10 text-xs font-light uppercase tracking-[0.1rem] text-neutral-950 shadow-lg sm:text-sm sm:tracking-[0.0875rem]"
      >
        Try Free
      </UButton>
    </div>
  </main>
  <footer
    class="border-t border-white/10 px-4 pt-5 sm:pt-12 pb-5 sm:pb-10 sm:px-12"
  >
    <div
      class="mx-auto flex max-w-360 flex-col gap-6 sm:flex-row items-center sm:justify-between"
    >
      <nav
        class="flex flex-wrap items-center gap-6 text-xs font-light uppercase tracking-[0.075rem] text-white/40"
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
