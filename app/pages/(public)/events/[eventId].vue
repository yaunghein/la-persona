<script setup lang="ts">
import type { PublicEventDTO } from '~~/shared/types/event';
import { eventStatus } from '~~/shared/utils/event-datetime';
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

const showHowToUse = ref(false);
const justRegistered = ref(String(route.query.registered || '') === '1');

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

const isPast = computed(() =>
  event.value ? eventStatus(event.value.endsAt) === 'past' : false
);

const canRegister = computed(
  () =>
    !isPast.value &&
    viewer.value.isMember &&
    viewer.value.cardComplete &&
    viewer.value.viewerRegistrationStatus === 'none' &&
    event.value?.registrationMode === 'open'
);

watch(
  [onboardingStep, session, event],
  () => {
    if (
      onboardingStep.value !== 'mingalarbar' ||
      !session.value ||
      !event.value
    ) {
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

function onViewOrganizer() {
  toast.add({
    title: 'Organizer card',
    description: 'This organizer does not have a community card yet.',
    color: 'neutral',
  });
}

function onRegister() {
  if (isPast.value) {
    toast.add({
      title: 'Event ended',
      description: 'Registration is closed because this event has ended.',
      color: 'neutral',
    });
    return;
  }

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

function onFlowDone() {
  if (!orgSlug.value) return;
  return navigateTo(`${ROUTES.PLATFORM.ROOT}/${orgSlug.value}/cards`);
}
</script>

<template>
  <div class="flex h-dvh overflow-hidden bg-[#171717]">
    <div class="flex h-full min-h-0 w-full flex-col bg-[#171717]">
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
        @done="onFlowDone"
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
        @completed="onFlowDone"
        @how-to-use="onHowToUse"
      />
    </div>
  </div>
</template>
