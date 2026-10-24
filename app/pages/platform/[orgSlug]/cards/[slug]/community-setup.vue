<script setup lang="ts">
import {
  isCommunityCardComplete,
  parseCommunitySetupStep,
  resolveCommunitySetupStep,
  resolveEventFlowPath,
} from '~~/shared/utils/event-flow';
import { ROUTES } from '~~/shared/utils/routes';

definePageMeta({
  layout: false,
});

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
  isPending: pending,
  error,
  refetch: refresh,
} = useCardQuery(cardSlug);
const { mutateAsync: updateCard } = useUpdateCardMutation(cardSlug);

const submitting = ref(false);
const isSettingUp = ref(false);
const createCardDraftKey = computed(() => `card:${cardSlug.value}:onboarding`);

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
  [card, session, requestedStep, isSettingUp, submitting],
  () => {
    if (
      pending.value ||
      !card.value ||
      !session.value ||
      isSettingUp.value ||
      submitting.value
    ) {
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

async function onCreateCard(payload: {
  firstName: string;
  lastName: string;
  position: string;
  phone: string;
  phoneCountryCode: string;
  email: string;
  socials: { label: string; value: string }[];
}) {
  if (!card.value) return;
  submitting.value = true;
  try {
    await updateCard({
      firstName: payload.firstName,
      lastName: payload.lastName || null,
      position: payload.position,
      phone: payload.phone,
      phoneCountryCode: payload.phoneCountryCode,
      email: payload.email,
      socials: payload.socials,
    });
    clearFormDraft(createCardDraftKey.value);
    isSettingUp.value = true;
    await refresh();
  } catch (error: any) {
    toast.add({
      title: 'Could not save card',
      description: apiErrorMessage(error, 'Try again.'),
      color: 'error',
    });
  } finally {
    submitting.value = false;
  }
}

async function onSettingUpNext() {
  await navigateTo(
    ROUTES.COMMUNITY_SETUP.CARD(orgSlug.value, cardSlug.value, {
      step: 'download-wallpaper',
      eventId: eventId.value || undefined,
    })
  );
  isSettingUp.value = false;
}

function goToEvent() {
  return navigateTo(eventHome());
}

const finishing = ref(false);

async function finishSetup() {
  if (finishing.value) return;
  if (!eventId.value) {
    return navigateTo(
      orgSlug.value
        ? `${ROUTES.PLATFORM.ROOT}/${orgSlug.value}`
        : ROUTES.PLATFORM.ROOT
    );
  }

  finishing.value = true;
  try {
    await registerForEvent(eventId.value);
    return navigateTo({
      path: ROUTES.EVENTS.PUBLIC(eventId.value),
      query: { registered: '1' },
    });
  } catch (error: any) {
    toast.add({
      title: 'Could not register',
      description: apiErrorMessage(
        error,
        'Your card is ready. You can register from the event page.'
      ),
      color: 'error',
    });
    return navigateTo(ROUTES.EVENTS.PUBLIC(eventId.value));
  } finally {
    finishing.value = false;
  }
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
        v-else-if="error || !card"
        class="flex flex-1 items-center justify-center px-6 text-center text-sm text-subtle"
      >
        This community card could not be loaded.
      </div>
      <EventOnboardingCreateCard
        v-else-if="(step === 'create-card' || submitting) && !isSettingUp"
        class="min-h-0 flex-1"
        :first-name="card.firstName"
        :last-name="card.lastName"
        :position="card.position"
        :phone="card.phone"
        :phone-country-code="card.phoneCountryCode"
        :email="card.email"
        :socials="card.socials"
        :submitting="submitting"
        :draft-key="createCardDraftKey"
        @submit="onCreateCard"
        @cancel="goToEvent"
      />
      <div
        v-else-if="!isSettingUp && step !== 'download-wallpaper'"
        class="flex flex-1 items-center justify-center"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-6 animate-spin text-subtle"
        />
      </div>
      <EventOnboardingSettingUp
        v-else-if="isSettingUp"
        class="min-h-0 flex-1"
        :organizer-name="card.organization.name || 'this community'"
        @next="onSettingUpNext"
      />
      <EventOnboardingDownloadWallpaper
        v-else-if="step === 'download-wallpaper'"
        class="min-h-0 flex-1"
        :first-name="card.firstName"
        :last-name="card.lastName"
        :position="card.position"
        :phone="card.phone"
        :phone-country-code="card.phoneCountryCode"
        :email="card.email"
        :website="card.website"
        :plan-code="card.subscription?.planCode"
        :spline-url="card.splineUrl"
        :wallpaper-url="card.wallpaperUrl"
        :joined-at="card.createdAt"
        :card-slug="card.slug"
        @next="finishSetup"
        @skip="finishSetup"
      />
    </div>
  </div>
</template>
