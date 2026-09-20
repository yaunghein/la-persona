<script setup lang="ts">
definePageMeta({
  layout: false,
});

import { Application } from '@splinetool/runtime';
import type { CardDTO } from '~~/shared/types/card';
import {
  isCommunityCardComplete,
  parseCommunitySetupStep,
  resolveCommunitySetupStep,
  resolveEventFlowPath,
} from '~~/shared/utils/event-flow';
import { ROUTES } from '~~/shared/utils/routes';

const route = useRoute();
const toast = useToast();
const orgSlug = computed(() => String(route.params.orgSlug || ''));
const cardSlug = computed(() => String(route.params.slug || ''));
const eventId = computed(() => {
  const value = route.query.eventId;
  return typeof value === 'string' ? value : '';
});
const requestedStep = computed(() => parseCommunitySetupStep(route.query.step));

const { data: session } = await authClient.useSession(useFetch);

const {
  data: card,
  pending,
  error,
  refresh,
} = await useFetch<CardDTO>(() => `/api/cards/${cardSlug.value}`, {
  query: { organizationSlug: orgSlug.value },
});

const submitting = ref(false);
const isSettingUp = ref(false);
const splineCanvasEl = ref<HTMLCanvasElement | null>(null);
let splineApp: Application | null = null;
let mediaQuery: MediaQueryList | null = null;

const viewer = computed<EventFlowViewer>(() => ({
  isAuthenticated: Boolean(session.value),
  isMember: true,
  cardSlug: cardSlug.value,
  cardComplete: Boolean(card.value && isCommunityCardComplete(card.value)),
  viewerRegistrationStatus: 'none',
}));

const step = computed(() =>
  resolveCommunitySetupStep({
    cardComplete: viewer.value.cardComplete,
    requestedStep: requestedStep.value,
  })
);

watch(
  [card, session, requestedStep, isSettingUp],
  () => {
    if (pending.value || !card.value || !session.value || isSettingUp.value) {
      return;
    }
    if (card.value.userId && card.value.userId !== session.value.user.id) {
      if (eventId.value) {
        navigateTo(
          ROUTES.COMMUNITY_SETUP.BOOTSTRAP(orgSlug.value, eventId.value),
          { replace: true }
        );
      }
      return;
    }

    const next = resolveEventFlowPath({
      eventId: eventId.value,
      orgSlug: orgSlug.value,
      viewer: viewer.value,
      source: 'setup',
      setupStep: requestedStep.value,
    });

    if (next !== route.fullPath) {
      navigateTo(next, { replace: true });
    }
  },
  { immediate: true }
);

function eventHome() {
  return eventId.value
    ? ROUTES.EVENTS.PUBLIC(eventId.value)
    : `${ROUTES.PLATFORM.ROOT}/${orgSlug.value}`;
}

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

async function onCreateCard(payload: {
  firstName: string;
  lastName: string;
  position: string;
  phone: string;
  email: string;
  socials: { label: string; value: string }[];
}) {
  if (!card.value) return;
  submitting.value = true;
  try {
    await $fetch('/api/cards', {
      method: 'PATCH',
      query: { organizationSlug: orgSlug.value },
      body: {
        id: card.value.id,
        firstName: payload.firstName,
        lastName: payload.lastName || null,
        position: payload.position,
        phone: payload.phone,
        email: payload.email,
        socials: payload.socials,
      },
    });
    isSettingUp.value = true;
    await refresh();
  } catch (error: any) {
    toast.add({
      title: 'Could not save card',
      description:
        error?.data?.statusMessage || error?.statusMessage || 'Try again.',
      color: 'error',
    });
  } finally {
    submitting.value = false;
  }
}

function onSettingUpNext() {
  isSettingUp.value = false;
  return navigateTo(
    ROUTES.COMMUNITY_SETUP.CARD(orgSlug.value, cardSlug.value, {
      step: 'download-wallpaper',
      eventId: eventId.value || undefined,
    })
  );
}

function goToEvent() {
  return navigateTo(eventHome());
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
        <div
          v-if="pending"
          class="flex flex-1 items-center justify-center"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-6 animate-spin text-[#8b8b8b]"
          />
        </div>
        <div
          v-else-if="error || !card"
          class="flex flex-1 items-center justify-center px-6 text-center text-sm text-[#8b8b8b]"
        >
          This community card could not be loaded.
        </div>
        <CommunityEventOnboardingCreateCard
          v-else-if="step === 'create-card' && !isSettingUp"
          class="min-h-0 flex-1"
          :first-name="card.firstName"
          :last-name="card.lastName"
          :position="card.position"
          :phone="card.phone"
          :email="card.email"
          :socials="card.socials"
          :submitting="submitting"
          @submit="onCreateCard"
          @cancel="goToEvent"
        />
        <div
          v-else-if="!isSettingUp && step !== 'download-wallpaper'"
          class="flex flex-1 items-center justify-center"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-6 animate-spin text-[#8b8b8b]"
          />
        </div>
        <CommunityEventOnboardingSettingUp
          v-else-if="isSettingUp"
          class="min-h-0 flex-1"
          :organizer-name="card.organizationName || 'this community'"
          @next="onSettingUpNext"
        />
        <CommunityEventOnboardingDownloadWallpaper
          v-else-if="step === 'download-wallpaper'"
          class="min-h-0 flex-1"
          :first-name="card.firstName"
          :last-name="card.lastName"
          :position="card.position"
          :phone="card.phone"
          :email="card.email"
          :wallpaper-url="card.wallpaperUrl"
          @next="goToEvent"
          @skip="goToEvent"
        />
      </div>
    </div>
  </div>
</template>
