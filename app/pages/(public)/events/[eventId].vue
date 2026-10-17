<script setup lang="ts">
import type { PublicEventDTO } from '~~/shared/contracts/event';
import { registrationBlockReason } from '~~/shared/utils/event-datetime';
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

usePageSeo({
  title: () =>
    event.value?.title || (error.value ? 'Event not found' : 'Event'),
  description: () => {
    if (!event.value) return null;
    const { location, organizer, description } = event.value;
    return truncateSeoText(
      [
        location,
        organizer?.name && `Hosted by ${organizer.name}`,
        description || 'Register on LA PERSONA.',
      ]
        .filter(Boolean)
        .join(' · ')
    );
  },
  image: () => event.value?.coverUrl,
  imageAlt: () => event.value?.title,
});

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

const registrationBlock = computed(() => {
  if (!event.value) return null;
  return registrationBlockReason({
    startsAt: event.value.startsAt,
    endsAt: event.value.endsAt,
    registrationMode: event.value.registrationMode,
    capacity: event.value.capacity,
    registeredCount: event.value.registeredCount,
  });
});

const canRegister = computed(
  () =>
    registrationBlock.value === null &&
    viewer.value.isMember &&
    viewer.value.cardComplete &&
    viewer.value.viewerRegistrationStatus === 'none'
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
    if (registrationBlock.value) {
      return navigateTo(ROUTES.EVENTS.PUBLIC(eventId.value));
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
  if (registrationBlock.value) return;

  if (canRegister.value) {
    refresh();
    return;
  }

  if (!event.value || !orgSlug.value) return;

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

      <EventOnboardingMingalarbar
        v-else-if="onboardingStep === 'mingalarbar' && !registrationBlock"
        class="min-h-0 flex-1"
        :organizer-name="event.organizer?.name || 'this community'"
        @next="onCreateAccount"
        @cancel="onCancelOnboarding"
      />

      <EventRegisterFlow
        v-else
        class="min-h-0 flex-1"
        variant="page"
        :event="event"
        :organizer="event.organizer"
        :organization-slug="orgSlug"
        :can-register="canRegister"
        :viewer-registration-status="viewer.viewerRegistrationStatus"
        @register="onRegister"
        @view-organizer="onViewOrganizer"
      />
    </div>
  </div>
</template>
