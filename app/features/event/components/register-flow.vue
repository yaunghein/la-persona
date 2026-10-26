<script setup lang="ts">
import type {
  EventDTO,
  EventOrganizer,
  ViewerRegistrationStatus,
} from '~~/shared/contracts/event';
import { useQueryClient } from '@tanstack/vue-query';
import {
  formatEventTimeLabel,
  formatEventWeekdayDateLabel,
  registrationBlockReason,
  spotsRemaining,
} from '~~/shared/utils/event-datetime';
import { eventGalleryImages } from '~~/shared/utils/event-media';
import { communityCardPath } from '~~/shared/utils/routes';

const props = withDefaults(
  defineProps<{
    event: EventDTO;
    organizer?: EventOrganizer | null;
    variant?: 'slideover' | 'page';
    organizationSlug?: string;
    canRegister?: boolean;
    viewerRegistrationStatus?: ViewerRegistrationStatus;
  }>(),
  {
    variant: 'slideover',
    canRegister: true,
    viewerRegistrationStatus: 'none',
  }
);

const { organizationSlug } = useOrganizationSlug();
const queryClient = useQueryClient();
const toast = useToast();
const isPage = computed(() => props.variant === 'page');
const registrationStatus = ref<'registered' | 'pending'>(
  props.viewerRegistrationStatus === 'pending' ? 'pending' : 'registered'
);

const resolvedOrgSlug = computed(
  () => props.organizationSlug || organizationSlug.value
);

// Server rendering doesn't know the viewer's timezone or clock, so time-based UI fills in after mount.
const isMounted = useMounted();

const {
  isEnabled: isGoogleCalendarEnabled,
  addingEventId,
  addToGoogleCalendar,
} = useGoogleCalendar(resolvedOrgSlug);
const canAddToGoogleCalendar = computed(
  () =>
    isMounted.value &&
    isGoogleCalendarEnabled.value &&
    Boolean(resolvedOrgSlug.value) &&
    registrationStatus.value === 'registered' &&
    new Date(props.event.endsAt).getTime() > Date.now()
);

const organizerCardUrl = computed(() =>
  props.organizer?.cardSlug ? communityCardPath(props.organizer.cardSlug) : ''
);

const emit = defineEmits<{
  viewOrganizer: [event: EventDTO];
  register: [event: EventDTO];
  stepChange: [step: RegisterStep];
}>();

type RegisterStep = 'confirm' | 'registering' | 'success';

const step = ref<RegisterStep>(
  props.viewerRegistrationStatus !== 'none' ? 'success' : 'confirm'
);
let registeringTimer: ReturnType<typeof setTimeout> | null = null;

const galleryImages = computed(() =>
  eventGalleryImages(props.event.coverUrl, props.event.photoUrls)
);

const registeredCount = computed(() => {
  const value = (props.event as { registeredCount?: number }).registeredCount;
  return typeof value === 'number' ? value : 0;
});

const registrationBlock = computed(() =>
  registrationBlockReason({
    startsAt: props.event.startsAt,
    endsAt: props.event.endsAt,
    registrationMode: props.event.registrationMode,
    capacity: props.event.capacity,
    registeredCount: registeredCount.value,
  })
);

const details = computed(() => {
  const rows: { label: string; value: string; href?: string }[] = [
    {
      label: 'Date',
      value: isMounted.value
        ? formatEventWeekdayDateLabel(props.event.startsAt)
        : '',
    },
    {
      label: 'Time',
      value: isMounted.value
        ? `${formatEventTimeLabel(props.event.startsAt)} – ${formatEventTimeLabel(props.event.endsAt)}`
        : '',
    },
    {
      label: 'Location',
      value: props.event.location,
      href: props.event.mapUrl || undefined,
    },
  ];

  if (
    'registeredCount' in props.event &&
    typeof (props.event as { registeredCount?: number }).registeredCount ===
      'number' &&
    props.event.capacity != null &&
    !isPage.value
  ) {
    rows.push({
      label: 'Capacity',
      value: `${(props.event as { registeredCount: number }).registeredCount}/${props.event.capacity}`,
    });
  } else if (props.event.capacity != null && !isPage.value) {
    rows.push({
      label: 'Capacity',
      value: `0/${props.event.capacity}`,
    });
  }

  return rows;
});

const spotsLabel = computed(() => {
  const remaining = spotsRemaining(props.event.capacity, registeredCount.value);
  if (remaining == null) return '';
  return `${remaining} spot${remaining === 1 ? '' : 's'} available`;
});

function clearRegisteringTimer() {
  if (!registeringTimer) return;
  clearTimeout(registeringTimer);
  registeringTimer = null;
}

async function startRegister() {
  if (step.value !== 'confirm' || registrationBlock.value) return;

  if (isPage.value && !props.canRegister) {
    emit('register', props.event);
    return;
  }

  step.value = 'registering';
  try {
    const result = await registerForEvent(props.event.id);
    registrationStatus.value =
      result.status === 'pending' ? 'pending' : 'registered';
    step.value = 'success';
    await queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });
    emit('register', props.event);
  } catch (error: any) {
    step.value = 'confirm';
    toast.add({
      title: 'Could not register',
      description: apiErrorMessage(error, 'Try again.'),
      color: 'error',
    });
  }
}

function onViewOrganizer() {
  emit('viewOrganizer', props.event);
}

watch(
  step,
  (value) => {
    emit('stepChange', value);
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  clearRegisteringTimer();
});
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div
      v-if="step !== 'success'"
      class="hide-scrollbar min-h-0 flex-1 overflow-y-auto p-6"
      :class="isPage ? 'sm:p-8 lg:px-16 lg:py-10' : ''"
    >
      <div
        class="mx-auto flex w-full flex-col gap-8"
        :class="isPage ? 'max-w-120 sm:max-w-md' : ''"
      >
        <div
          class="relative aspect-[1/0.75] w-full overflow-hidden rounded-lg bg-raised"
        >
          <UCarousel
            v-if="galleryImages.length > 1"
            v-slot="{ item }"
            loop
            dots
            align="start"
            :items="galleryImages"
            class="size-full"
            :ui="{
              viewport: 'size-full',
              container: 'ms-0 h-full items-stretch',
              item: 'relative h-full min-h-0 basis-full overflow-hidden ps-0',
              dots: 'absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-2',
              dot: 'size-2 rounded-full bg-ink/40 data-[state=active]:bg-ink',
            }"
          >
            <UiSkeletonImage
              :src="item"
              :alt="event.title"
              width="480"
              class="absolute inset-0 size-full object-cover"
            />
          </UCarousel>
          <UiSkeletonImage
            v-else-if="galleryImages[0]"
            :src="galleryImages[0]"
            :alt="event.title"
            width="480"
            class="size-full object-cover"
          />
        </div>

        <div class="flex flex-col gap-6">
          <div class="flex flex-col gap-4">
            <h1
              class="text-xl font-medium leading-[1.35] tracking-[0.125rem] uppercase text-ink"
            >
              {{ event.title }}
            </h1>
            <UiRichText
              v-if="event.description"
              :content="event.description"
              class="text-sm font-normal leading-normal text-subtle"
            />
          </div>

          <div class="flex flex-col divide-y divide-line">
            <div
              v-for="item in details"
              :key="item.label"
              class="flex items-start justify-between gap-4 px-4 py-3"
            >
              <span class="shrink-0 text-sm font-normal text-subtle">
                {{ item.label }}
              </span>
              <div class="flex min-w-0 flex-col items-end gap-1">
                <span class="text-right text-sm text-ink">
                  {{ item.value }}
                </span>
                <UButton
                  v-if="item.href"
                  :to="item.href"
                  target="_blank"
                  external
                  rel="noopener noreferrer"
                  variant="link"
                  color="neutral"
                  size="sm"
                  trailing-icon="i-lucide-external-link"
                  label="View on Google Map"
                  class="p-0 text-subtle hover:text-ink"
                />
              </div>
            </div>
            <div
              v-if="organizer?.name"
              class="flex items-center justify-between gap-4 px-4 py-3"
            >
              <span class="shrink-0 text-sm font-normal text-subtle">
                Organizer
              </span>
              <div class="flex min-w-0 items-center justify-end gap-2">
                <UAvatar
                  :src="organizer.logoUrl || undefined"
                  :alt="organizer.name"
                  icon="i-lucide-users"
                  :ui="{
                    root: 'size-6 bg-raised',
                    icon: 'size-3 text-subtle',
                  }"
                />
                <span class="text-right text-sm text-ink">
                  {{ organizer.name }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else
      class="flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5 px-6 py-13 text-center"
      :class="isPage ? 'sm:px-8 lg:px-16' : ''"
    >
      <UIcon name="i-material-symbols:verified" class="size-23 text-green" />
      <div class="flex w-full max-w-88 flex-col items-center gap-4">
        <p
          class="text-xl font-medium leading-[1.35] tracking-[2px] uppercase text-green"
        >
          We'll see you there.
        </p>
        <p class="text-sm leading-normal text-ink">
          <template v-if="registrationStatus === 'pending'">
            Your registration for
            <span class="font-bold">{{ event.title }}</span>
            is waiting for organizer approval.
          </template>
          <template v-else>
            You're registered for
            <span class="font-bold">{{ event.title }}.</span>
            We'll send you a reminder before the event.
          </template>
        </p>
      </div>
    </div>

    <div
      v-if="isPage || step !== 'success' || canAddToGoogleCalendar"
      class="shrink-0"
      :class="
        isPage
          ? 'border-t border-line px-6 py-4 sm:px-8 lg:px-16'
          : 'border-t-2 border-raised px-6 py-4'
      "
    >
      <div
        class="flex w-full"
        :class="
          isPage
            ? 'mx-auto max-w-120 flex-col items-center gap-4 sm:max-w-md'
            : 'flex-wrap items-center justify-end gap-2'
        "
      >
        <template v-if="step !== 'success'">
          <UButton
            v-if="!isPage && organizerCardUrl"
            label="Contact Organizer"
            color="neutral"
            :href="organizerCardUrl"
            target="_blank"
            class="h-10 cursor-pointer rounded-full bg-raised px-5 text-sm font-medium text-ink hover:bg-line"
          />
          <UButton
            v-else-if="!isPage"
            label="Contact Organizer"
            color="neutral"
            class="h-10 cursor-pointer rounded-full bg-raised px-5 text-sm font-medium text-ink hover:bg-line"
            @click="onViewOrganizer"
          />
          <UButton
            v-if="registrationBlock"
            :label="
              registrationBlock === 'past'
                ? 'Event ended'
                : registrationBlock === 'full'
                  ? 'Event full'
                  : registrationBlock === 'invite_only'
                    ? 'Invite only'
                    : 'Registration closed'
            "
            color="neutral"
            disabled
            class="h-10 justify-center rounded-full bg-ink/10 px-5 text-sm font-medium text-ink/50 disabled:bg-ink/10 disabled:opacity-100"
            :class="isPage && 'w-full'"
          />
          <UButton
            v-else-if="step === 'confirm'"
            color="neutral"
            :block="isPage"
            class="h-10 cursor-pointer rounded-full bg-ink px-5 text-sm hover:bg-ink/90"
            :ui="{
              base: 'flex-col gap-0.5',
              label:
                'flex flex-col items-center gap-0.5 whitespace-normal text-center',
            }"
            @click="startRegister"
          >
            <span class="text-sm font-medium leading-[1.1] text-ink-inverse">
              Register
            </span>
            <span
              v-if="spotsLabel"
              class="text-[0.6875rem] font-semibold tracking-[0.55px] text-danger-ink"
            >
              {{ spotsLabel }}
            </span>
          </UButton>
          <UButton
            v-else
            label="Registering..."
            color="neutral"
            loading
            class="h-10 justify-center rounded-full bg-ink/10 px-5 text-sm font-medium text-ink/50 disabled:bg-ink/10 disabled:opacity-100"
            :class="isPage && 'w-full'"
          />
          <template v-if="isPage">
            <a
              v-if="organizerCardUrl"
              :href="organizerCardUrl"
              target="_blank"
              class="text-sm font-medium text-ink underline underline-offset-4 hover:text-ink/80"
            >
              Contact Organizer
            </a>
            <button
              v-else
              type="button"
              class="cursor-pointer text-sm font-medium text-ink underline underline-offset-4 hover:text-ink/80"
              @click="onViewOrganizer"
            >
              Contact Organizer
            </button>
          </template>
        </template>
        <UButton
          v-else-if="canAddToGoogleCalendar"
          label="Add to Google Calendar"
          :avatar="{ src: '/images/google-calendar-icon.svg', alt: '' }"
          :ui="{ leadingAvatar: 'rounded-none bg-transparent' }"
          color="neutral"
          :loading="addingEventId === event.id"
          class="h-10 cursor-pointer justify-center rounded-full bg-ink px-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
          :class="isPage && 'w-full'"
          @click="void addToGoogleCalendar(event.id)"
        />
        <UiPoweredByLaPersona v-if="isPage" />
      </div>
    </div>
  </div>
</template>
