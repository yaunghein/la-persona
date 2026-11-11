<script setup lang="ts">
import type { PublicEventDTO } from '~~/shared/contracts/event';
import {
  checkInPhase,
  registrationBlockReason,
} from '~~/shared/utils/event-datetime';
import { parseEventOnboardingStep } from '~~/shared/utils/event-onboarding';
import {
  communitySetupSignInPath,
  resolveEventFlowPath,
  type EventFlowViewer,
  type RegistrationIntent,
} from '~~/shared/utils/event-flow';
import { ROUTES } from '~~/shared/utils/routes';

const props = withDefaults(
  defineProps<{
    intent?: RegistrationIntent;
  }>(),
  { intent: 'public' }
);

const route = useRoute();
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

if (props.intent === 'walk_in') {
  const phase = event.value
    ? checkInPhase(
        event.value.startsAt,
        event.value.endsAt,
        event.value.timeZone
      )
    : 'before';
  if (phase !== 'live') {
    throw createError({
      statusCode: 404,
      statusMessage: 'Page not found',
    });
  }
}

function eventPath() {
  return props.intent === 'walk_in'
    ? ROUTES.EVENTS.WALK_IN(eventId.value)
    : ROUTES.EVENTS.PUBLIC(eventId.value);
}

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
        .join(' • ')
    );
  },
  image: () => resolveObjectStorageUrl(event.value?.coverUrl),
  imageAlt: () => event.value?.title,
});

useInAppBrowserPreview(() => {
  if (!event.value) return null;
  const { coverUrl, title, description } = event.value;
  return {
    heading: 'Register for This Event in Your\u00a0Browser',
    item: {
      imageUrl: resolveObjectStorageUrl(coverUrl) || null,
      title,
      description: description ? truncateSeoText(description, 100) : null,
    },
  };
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

// Registered members land on the same "You're all set" screen as the register flow.
const registeredStatus = computed(() => {
  const status = viewer.value.viewerRegistrationStatus;
  if (status === 'none' || !viewer.value.cardSlug) return null;
  return status === 'pending' ? 'pending' : 'registered';
});
// Server-side fetches carry no session cookie, so load the private card in the browser only.
const isMounted = useMounted();
const { data: viewerCard } = useCardQuery(() =>
  isMounted.value && registeredStatus.value ? viewer.value.cardSlug || '' : ''
);
const {
  canAdd: canAddToGoogleCalendar,
  isAdding: isAddingToGoogleCalendar,
  isAdded: isAddedToGoogleCalendar,
  add: addToGoogleCalendar,
} = useRegisteredEventCalendar({
  eventId,
  orgSlug,
  endsAt: () => event.value?.endsAt,
  isRegistered: () => registeredStatus.value === 'registered',
  returnPath: () => eventPath(),
});

const registrationBlock = computed(() => {
  if (!event.value) return null;
  const block = registrationBlockReason({
    startsAt: event.value.startsAt,
    endsAt: event.value.endsAt,
    registrationMode: event.value.registrationMode,
    capacity: event.value.capacity,
    registeredCount: event.value.registeredCount,
  });
  if (
    props.intent === 'walk_in' &&
    (block === 'closed' || block === 'invite_only')
  ) {
    return null;
  }
  return block;
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
      return navigateTo(eventPath());
    }
    const next = resolveEventFlowPath({
      eventId: eventId.value,
      orgSlug: orgSlug.value,
      viewer: viewer.value,
      source: 'mingalarbar',
      intent: props.intent,
    });
    if (next !== route.fullPath) {
      navigateTo(next);
    }
  },
  { immediate: true }
);

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
    intent: props.intent,
  });

  if (!viewer.value.isAuthenticated) {
    return navigateTo(
      props.intent === 'walk_in'
        ? ROUTES.EVENTS.WALK_IN_MINGALARBAR(eventId.value)
        : ROUTES.EVENTS.PUBLIC_MINGALARBAR(eventId.value)
    );
  }

  return navigateTo(next);
}

function onCreateAccount() {
  if (!orgSlug.value) return;
  return navigateTo(
    communitySetupSignInPath(orgSlug.value, eventId.value, props.intent)
  );
}

function onCancelOnboarding() {
  return navigateTo(eventPath());
}
</script>

<template>
  <div class="flex h-dvh overflow-hidden bg-surface">
    <div class="flex h-full min-h-0 w-full flex-col bg-surface">
      <div v-if="pending" class="flex flex-1 items-center justify-center">
        <UIcon
          name="i-lucide-loader-circle"
          class="size-6 animate-spin text-subtle"
        />
      </div>

      <div
        v-else-if="error || !event"
        class="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center"
      >
        <p class="text-sm text-subtle">
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

      <EventOnboardingRegistered
        v-else-if="registeredStatus"
        class="min-h-0 flex-1"
        :event-title="event.title"
        :registration-status="registeredStatus"
        :can-add-to-google-calendar="canAddToGoogleCalendar"
        :adding-to-google-calendar="isAddingToGoogleCalendar"
        :is-added-to-google-calendar="isAddedToGoogleCalendar"
        :first-name="viewerCard?.firstName"
        :last-name="viewerCard?.lastName"
        :position="viewerCard?.position"
        :phone="viewerCard?.phone"
        :phone-country-code="viewerCard?.phoneCountryCode"
        :email="viewerCard?.email"
        :website="viewerCard?.website"
        :plan-code="viewerCard?.subscription?.planCode"
        :spline-url="viewerCard?.splineUrl"
        :joined-at="viewerCard?.createdAt"
        @add-to-google-calendar="addToGoogleCalendar()"
      />

      <EventRegisterFlow
        v-else
        class="min-h-0 flex-1"
        variant="page"
        :intent="intent"
        :event="event"
        :organizer="event.organizer"
        :organization-slug="orgSlug"
        :can-register="canRegister"
        :viewer-registration-status="viewer.viewerRegistrationStatus"
        @register="onRegister"
      />
    </div>
  </div>
</template>
