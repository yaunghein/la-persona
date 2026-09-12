<script setup lang="ts">
import type { PublicEventDTO } from '~~/shared/types/event';
import {
  EVENT_ONBOARDING_NEXT,
  parseEventOnboardingStep,
  type EventOnboardingStep,
} from '~~/shared/utils/event-onboarding';

const props = defineProps<{
  event: PublicEventDTO;
}>();

const route = useRoute();

const step = computed(() => parseEventOnboardingStep(route.query.onboarding));

const organizerName = computed(
  () => props.event.organizer?.name || 'this community'
);

function setStep(next: EventOnboardingStep | null) {
  const url = next ? `${route.path}?onboarding=${next}` : route.path;
  return navigateTo(url);
}

function goNext() {
  if (!step.value) return;
  setStep(EVENT_ONBOARDING_NEXT[step.value]);
}

function goHome() {
  setStep(null);
}
</script>

<template>
  <CommunityEventOnboardingMingalarbar
    v-if="step === 'mingalarbar'"
    :organizer-name="organizerName"
    @next="goNext"
    @cancel="goHome"
  />
  <CommunityEventOnboardingCreateCard
    v-else-if="step === 'create-card'"
    @next="goNext"
    @cancel="goHome"
  />
  <CommunityEventOnboardingSettingUp
    v-else-if="step === 'setting-up'"
    :organizer-name="organizerName"
    @next="goNext"
  />
  <CommunityEventOnboardingDownloadWallpaper
    v-else-if="step === 'download-wallpaper'"
    @next="goNext"
  />
  <CommunityEventOnboardingRegisterSuccess
    v-else-if="step === 'register-success'"
    :event-title="event.title"
    @next="goNext"
    @skip="goHome"
  />
  <CommunityEventOnboardingHowToUse
    v-else-if="step === 'how-to-use'"
    @done="goHome"
  />
</template>
