<script setup lang="ts">
import type { EventListItemDTO } from '~~/shared/contracts/event';
import {
  formatEventTimeLabel,
  formatEventWeekdayDateLabel,
  registrationBlockReason,
} from '~~/shared/utils/event-datetime';
import { eventGalleryImages } from '~~/shared/utils/event-media';

const props = defineProps<{
  event?: EventListItemDTO | null;
}>();

const open = defineModel<boolean>('open', { default: false });

const emit = defineEmits<{
  register: [event: EventListItemDTO];
}>();

const galleryImages = computed(() => {
  if (!props.event) return [];
  return eventGalleryImages(props.event.coverUrl, props.event.photoUrls);
});

const details = computed(() => {
  if (!props.event) return [];

  return [
    {
      label: 'Date',
      value: formatEventWeekdayDateLabel(props.event.startsAt),
    },
    {
      label: 'Time',
      value: `${formatEventTimeLabel(props.event.startsAt)} – ${formatEventTimeLabel(props.event.endsAt)}`,
    },
    {
      label: 'Location',
      value: props.event.location,
      href: props.event.mapUrl || undefined,
    },
  ];
});

function registrationBlock(event: EventListItemDTO) {
  return registrationBlockReason({
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    registrationMode: event.registrationMode,
    capacity: event.capacity,
    registeredCount: event.registeredCount,
  });
}

function closedLabel(event: EventListItemDTO) {
  if (event.viewerRegistrationStatus === 'pending') return 'Pending';
  if (event.viewerRegistrationStatus === 'checked_in') return 'Checked in';
  if (event.viewerRegistrationStatus === 'registered') return 'Registered';

  const block = registrationBlock(event);
  if (block === 'past') return 'Ended';
  if (block === 'invite_only') return 'Invite only';
  if (block === 'full') return 'Full';
  return 'Closed';
}

const {
  isEnabled: isGoogleCalendarEnabled,
  addingEventId,
  addToGoogleCalendar,
} = useGoogleCalendar();
const canAddToGoogleCalendar = computed(() => {
  const event = props.event;
  if (!event || !isGoogleCalendarEnabled.value) return false;
  const confirmed =
    event.viewerRegistrationStatus === 'registered' ||
    event.viewerRegistrationStatus === 'checked_in';
  return confirmed && new Date(event.endsAt).getTime() > Date.now();
});

function onRegister() {
  if (!props.event) return;
  emit('register', props.event);
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    inset
    title="Event Details"
    close-icon="i-material-symbols:close-small"
    unmount-on-hide
    :ui="{
      content: 'bg-surface sm:max-w-120 divide-y-0',
      header: 'border-b-2 border-raised px-6 py-6',
      title: 'text-sm font-medium tracking-[1.4px] text-ink uppercase',
      body: 'p-6',
    }"
  >
    <template v-if="event" #body>
      <div class="flex flex-col gap-8">
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

        <div class="flex flex-col gap-4">
          <h2
            class="text-xl font-medium leading-[1.35] tracking-[0.125rem] uppercase text-ink"
          >
            {{ event.title }}
          </h2>
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
            <a
              v-if="item.href"
              :href="item.href"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex min-w-0 items-center gap-1.5 text-right text-sm font-bold text-ink hover:text-ink/80"
            >
              {{ item.value }}
              <UIcon
                name="i-lucide-external-link"
                class="size-4 shrink-0 text-subtle"
                aria-hidden="true"
              />
            </a>
            <span v-else class="text-right text-sm font-bold text-ink">
              {{ item.value }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <template v-if="event" #footer>
      <div class="flex items-center justify-end gap-2">
        <UButton
          v-if="
            event.viewerRegistrationStatus === 'none' &&
            registrationBlock(event) === null
          "
          label="Register"
          color="neutral"
          class="h-10 cursor-pointer rounded-full bg-ink px-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
          @click="onRegister"
        />
        <UButton
          v-else-if="canAddToGoogleCalendar"
          label="Add to Google Calendar"
          :avatar="{
            src: '/images/google-calendar-icon.svg',
            alt: '',
          }"
          :ui="{ leadingAvatar: 'rounded-none bg-transparent' }"
          color="neutral"
          :loading="addingEventId === event.id"
          class="h-10 cursor-pointer rounded-full bg-ink px-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
          @click="void addToGoogleCalendar(event.id)"
        />
        <UButton
          v-else
          :label="closedLabel(event)"
          color="neutral"
          disabled
          class="h-10 rounded-full bg-ink/10 px-5 text-sm font-medium text-ink/50 disabled:bg-ink/10 disabled:opacity-100"
        />
      </div>
    </template>
  </USlideover>
</template>
