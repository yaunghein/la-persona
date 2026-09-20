<script setup lang="ts">
import { Application } from '@splinetool/runtime';
import type { PublicEventDTO } from '~~/shared/types/event';
import { parseEventOnboardingStep } from '~~/shared/utils/event-onboarding';
import {
  communitySetupSignInPath,
  resolveEventFlowPath,
  type EventFlowViewer,
} from '~~/shared/utils/event-flow';
import { ROUTES } from '~~/shared/utils/routes';

const route = useRoute();
const toast = useToast();
const eventId = computed(() => String(route.params.eventId || ''));
const onboardingStep = computed(() =>
  parseEventOnboardingStep(route.query.onboarding)
);

const { data: session } = await authClient.useSession(useFetch);

const {
  data: event,
  pending,
  error,
  refresh,
} = await useFetch<PublicEventDTO>(() => `/api/public/events/${eventId.value}`);

useSeoMeta({
  ...getSeoTitle(event.value?.title ? `${event.value.title}` : 'Event'),
});

const splineCanvasEl = ref<HTMLCanvasElement | null>(null);
let splineApp: Application | null = null;
let mediaQuery: MediaQueryList | null = null;
const showHowToUse = ref(false);
const justRegistered = ref(false);

const orgSlug = computed(() => event.value?.organizer?.slug || '');

const viewer = computed<EventFlowViewer>(() => {
  if (!session.value) {
    return {
      isAuthenticated: false,
      isMember: false,
      cardSlug: null,
      cardComplete: false,
      viewerRegistrationStatus: 'none',
    };
  }

  return {
    isAuthenticated: true,
    isMember: event.value?.viewer?.isMember ?? false,
    cardSlug: event.value?.viewer?.cardSlug ?? null,
    cardComplete: event.value?.viewer?.cardComplete ?? false,
    viewerRegistrationStatus:
      event.value?.viewer?.viewerRegistrationStatus ?? 'none',
  };
});

const canRegister = computed(
  () =>
    viewer.value.isMember &&
    viewer.value.cardComplete &&
    viewer.value.viewerRegistrationStatus === 'none' &&
    event.value?.registrationMode === 'open'
);

watch(
  [onboardingStep, session, event],
  () => {
    if (onboardingStep.value !== 'mingalarbar' || !session.value || !event.value) {
      return;
    }
    const next = resolveEventFlowPath({
      eventId: eventId.value,
      orgSlug: orgSlug.value,
      viewer: viewer.value,
      source: 'mingalarbar',
    });
    if (next !== route.fullPath) {
      navigateTo(next);
    }
  },
  { immediate: true }
);

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
  if (canRegister.value) {
    justRegistered.value = true;
    refresh();
    return;
  }

  if (!event.value || !orgSlug.value) return;

  if (event.value.registrationMode === 'invite_only') {
    toast.add({
      title: 'Invite only',
      description: 'This event is invite only.',
      color: 'neutral',
    });
    return;
  }

  if (event.value.registrationMode === 'closed') {
    toast.add({
      title: 'Registration closed',
      description: 'Registration is closed for this event.',
      color: 'neutral',
    });
    return;
  }

  const next = resolveEventFlowPath({
    eventId: eventId.value,
    orgSlug: orgSlug.value,
    viewer: viewer.value,
    source: 'register',
  });

  if (!viewer.value.isAuthenticated) {
    return navigateTo(ROUTES.EVENTS.PUBLIC_MINGALARBAR(eventId.value));
  }

  return navigateTo(next);
}

function onCreateAccount() {
  if (!orgSlug.value) return;
  return navigateTo(communitySetupSignInPath(orgSlug.value, eventId.value));
}

function onCancelOnboarding() {
  return navigateTo(ROUTES.EVENTS.PUBLIC(eventId.value));
}

function onHowToUse() {
  showHowToUse.value = true;
}

function onHowToUseDone() {
  showHowToUse.value = false;
  justRegistered.value = false;
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

        <CommunityEventOnboardingMingalarbar
          v-else-if="onboardingStep === 'mingalarbar'"
          class="min-h-0 flex-1"
          :organizer-name="event.organizer?.name || 'this community'"
          @next="onCreateAccount"
          @cancel="onCancelOnboarding"
        />

        <CommunityEventOnboardingHowToUse
          v-else-if="showHowToUse"
          class="min-h-0 flex-1"
          @done="onHowToUseDone"
        />

        <CommunityEventRegisterFlow
          v-else
          class="min-h-0 flex-1"
          variant="page"
          :event="event"
          :organizer="event.organizer"
          :organization-slug="orgSlug"
          :can-register="canRegister"
          :viewer-registration-status="viewer.viewerRegistrationStatus"
          :how-to-use="justRegistered"
          @register="onRegister"
          @view-organizer="onViewOrganizer"
          @how-to-use="onHowToUse"
        />
      </div>
    </div>
  </div>
</template>
