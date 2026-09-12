<script setup lang="ts">
import { Application } from '@splinetool/runtime';
import type { PublicEventDTO } from '~~/shared/types/event';
import { parseEventOnboardingStep } from '~~/shared/utils/event-onboarding';

const route = useRoute();
const toast = useToast();
const eventId = computed(() => String(route.params.eventId || ''));
const onboardingStep = computed(() =>
  parseEventOnboardingStep(route.query.onboarding)
);

const {
  data: event,
  pending,
  error,
} = await useFetch<PublicEventDTO>(() => `/api/public/events/${eventId.value}`);

useSeoMeta({
  ...getSeoTitle(event.value?.title ? `${event.value.title}` : 'Event'),
});

const splineCanvasEl = ref<HTMLCanvasElement | null>(null);
let splineApp: Application | null = null;
let mediaQuery: MediaQueryList | null = null;

async function loadSpline() {
  const canvas = splineCanvasEl.value;
  if (!import.meta.client || !canvas || splineApp) return;

  splineApp = new Application(canvas);
  await splineApp.load(
    'https://prod.spline.design/szr0-6Srx9EJxnil/scene.splinecode' +
      `?v=${Date.now()}`
  );
}

function disposeSpline() {
  splineApp?.dispose();
  splineApp = null;
}

async function syncSplineViewport() {
  if (!mediaQuery?.matches) {
    disposeSpline();
    return;
  }
  await nextTick();
  await loadSpline();
}

onMounted(() => {
  if (!import.meta.client) return;

  mediaQuery = window.matchMedia('(min-width: 640px)');
  syncSplineViewport();
  mediaQuery.addEventListener('change', syncSplineViewport);
});

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener('change', syncSplineViewport);
  disposeSpline();
});

function onViewOrganizer() {
  toast.add({
    title: 'View organizer',
    description: 'Organizer profiles are not wired yet.',
    color: 'neutral',
  });
}

function onRegister() {
  return navigateTo(`${route.path}?onboarding=mingalarbar`);
}
</script>

<template>
  <div class="h-dvh overflow-hidden bg-dark">
    <div class="flex h-full min-h-0 flex-col sm:flex-row">
      <div
        class="relative hidden w-1/2 overflow-hidden bg-dark sm:block sm:h-full"
      >
        <canvas ref="splineCanvasEl" class="absolute inset-0 size-full" />
      </div>

      <div class="flex h-full min-h-0 w-full flex-col bg-[#171717] sm:w-1/2">
        <div v-if="pending" class="flex flex-1 items-center justify-center">
          <UIcon
            name="i-lucide-loader-circle"
            class="size-6 animate-spin text-[#8b8b8b]"
          />
        </div>

        <div
          v-else-if="error || !event"
          class="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center"
        >
          <p class="text-sm text-[#8b8b8b]">
            {{
              (error as { data?: { statusMessage?: string } })?.data
                ?.statusMessage || 'This event could not be found.'
            }}
          </p>
        </div>

        <CommunityEventOnboardingFlow
          v-else-if="onboardingStep && event"
          class="min-h-0 flex-1"
          :event="event"
        />

        <CommunityEventRegisterFlow
          v-else
          class="min-h-0 flex-1"
          variant="page"
          :event="event"
          :organizer="event.organizer"
          @register="onRegister"
          @view-organizer="onViewOrganizer"
        />
      </div>
    </div>
  </div>
</template>
