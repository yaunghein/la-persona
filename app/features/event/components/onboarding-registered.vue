<script setup lang="ts">
import { Application } from '@splinetool/runtime';
import { applyCommunityCardToSpline } from '~/features/card/utils/spline-card';

const props = defineProps<{
  eventTitle?: string | null;
  registrationStatus: 'registered' | 'pending';
  canAddToGoogleCalendar?: boolean;
  addingToGoogleCalendar?: boolean;
  isAddedToGoogleCalendar?: boolean;
  firstName?: string | null;
  lastName?: string | null;
  position?: string | null;
  phone?: string | null;
  phoneCountryCode?: string | null;
  email?: string | null;
  website?: string | null;
  planCode?: string | null;
  /** `undefined` while the card is still loading; `null` when it has no scene. */
  splineUrl?: string | null;
  joinedAt?: string | null;
}>();

const emit = defineEmits<{
  addToGoogleCalendar: [];
}>();

const colorMode = useColorMode();
const canvasEl = ref<HTMLCanvasElement | null>(null);
const splineLoading = ref(false);
const splineFailed = ref(false);
let splineApp: Application | null = null;

const cardFields = computed(() => ({
  firstName: props.firstName,
  lastName: props.lastName,
  position: props.position,
  phone: props.phone,
  phoneCountryCode: props.phoneCountryCode,
  email: props.email,
  website: props.website,
  planCode: props.planCode,
  joinedAt: props.joinedAt,
}));

function applyVariables() {
  if (!splineApp) return;
  splineApp.setBackgroundColor(
    colorMode.value === 'light' ? '#f6f6f8' : '#171717'
  );
  applyCommunityCardToSpline(splineApp, cardFields.value);
}

function disposeSpline() {
  splineApp?.dispose();
  splineApp = null;
}

async function loadSpline() {
  const url = props.splineUrl?.trim();
  if (!import.meta.client || !url) {
    splineFailed.value = !url;
    return;
  }

  await nextTick();
  const canvas = canvasEl.value;
  if (!canvas) return;

  disposeSpline();
  splineLoading.value = true;
  splineFailed.value = false;
  const spline = new Application(canvas);
  splineApp = spline;

  try {
    await spline.load(`${url}?v=${Date.now()}`);
    applyVariables();
  } catch {
    splineFailed.value = true;
    disposeSpline();
  } finally {
    splineLoading.value = false;
  }
}

watch([cardFields, () => colorMode.value], () => applyVariables());
watch(
  () => props.splineUrl,
  () => loadSpline()
);

onMounted(loadSpline);
onBeforeUnmount(disposeSpline);
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <p
      class="shrink-0 border-b border-line px-2.5 py-6 text-center text-sm font-bold leading-[1.1] text-ink"
    >
      You're all set
    </p>

    <div class="flex min-h-0 flex-1 flex-col overflow-x-hidden">
      <div
        class="flex shrink-0 flex-col items-center justify-center gap-2.5 px-6 pt-13 text-center"
      >
        <UIcon name="i-material-symbols:verified" class="size-23 text-green" />
        <div class="flex w-full max-w-82 flex-col items-center gap-4">
          <p
            class="text-xl font-medium leading-[1.35] tracking-[0.125rem] uppercase text-green"
          >
            We'll see you&nbsp;there.
          </p>
          <p class="text-sm leading-normal text-ink">
            <template v-if="registrationStatus === 'pending'">
              Your registration for
              <span class="font-bold">{{ eventTitle }}</span>
              is waiting for organizer&nbsp;approval.
            </template>
            <template v-else>
              You're registered for
              <span class="font-bold">{{ eventTitle }}</span
              >. We'll send you a reminder before the&nbsp;event.
            </template>
          </p>
        </div>
      </div>

      <div class="relative min-h-80 w-full flex-1 overflow-y-clip">
        <div
          class="absolute top-1/2 left-1/2 size-[200%] -translate-x-1/2 -translate-y-1/2 sm:size-full"
        >
          <canvas
            v-show="splineUrl && !splineFailed"
            ref="canvasEl"
            class="absolute inset-0 size-full"
          />
        </div>
        <div
          v-if="splineLoading || splineUrl === undefined"
          class="absolute inset-0 flex items-center justify-center"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-6 animate-spin text-subtle"
          />
        </div>
        <p
          v-else-if="!splineUrl || splineFailed"
          class="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-subtle"
        >
          This community card scene is not ready&nbsp;yet.
        </p>
      </div>
    </div>

    <div class="shrink-0 border-t border-line px-6 py-4 sm:px-8 lg:px-16">
      <div
        class="mx-auto flex w-full max-w-120 flex-col items-center gap-4 sm:max-w-112"
      >
        <UButton
          v-if="canAddToGoogleCalendar"
          :label="
            isAddedToGoogleCalendar
              ? 'Added to Google Calendar'
              : 'Add to Google Calendar'
          "
          :avatar="{ src: '/images/google-calendar-icon.svg', alt: '' }"
          :ui="{ leadingAvatar: 'rounded-none bg-transparent' }"
          color="neutral"
          block
          :loading="addingToGoogleCalendar"
          :disabled="isAddedToGoogleCalendar"
          class="h-13 sm:h-10 cursor-pointer justify-center rounded-full bg-ink px-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
          @click="emit('addToGoogleCalendar')"
        />
        <UiPoweredByLaPersona />
      </div>
    </div>
  </div>
</template>
