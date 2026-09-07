<script setup lang="ts">
import type { EventDTO } from '~~/shared/types/event';
import {
  formatEventTimeLabel,
  formatEventWeekdayDateLabel,
} from '~~/shared/utils/event-datetime';

const props = defineProps<{
  event?: EventDTO | null;
}>();

const open = defineModel<boolean>('open', { default: false });

const emit = defineEmits<{
  register: [event: EventDTO];
  viewOrganizer: [event: EventDTO];
}>();

const galleryImages = computed(() => {
  if (!props.event) return [];

  const urls = [props.event.coverUrl, ...(props.event.photoUrls ?? [])]
    .map((url) => String(url || '').trim())
    .filter(Boolean);

  return [...new Set(urls)];
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
    },
  ];
});

function onRegister() {
  if (!props.event) return;
  emit('register', props.event);
}

function onViewOrganizer() {
  if (!props.event) return;
  emit('viewOrganizer', props.event);
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
      content: 'bg-[#171717] sm:max-w-[480px]',
      header: 'border-b-2 border-[#232323] px-6 py-6',
      title: 'text-sm font-medium tracking-[1.4px] text-white uppercase',
      body: 'p-6',
      footer: 'p-6 justify-end!',
    }"
  >
    <template v-if="event" #body>
      <div class="flex flex-col gap-8">
        <div
          class="relative aspect-[1/0.75] w-full overflow-hidden rounded-lg bg-[#232323]"
        >
          <UCarousel
            v-if="galleryImages.length > 1"
            v-slot="{ item }"
            dots
            :items="galleryImages"
            class="size-full"
            :ui="{
              viewport: 'size-full',
              container: 'ms-0 h-full',
              item: 'ps-0 basis-full',
              dots: 'absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-2',
              dot: 'size-2 rounded-full bg-white/40 data-[state=active]:bg-white',
            }"
          >
            <img
              :src="item"
              :alt="event.title"
              class="size-full object-cover"
            />
          </UCarousel>
          <img
            v-else-if="galleryImages[0]"
            :src="galleryImages[0]"
            :alt="event.title"
            class="size-full object-cover"
          />
        </div>

        <div class="flex flex-col gap-4">
          <h2
            class="text-xl font-medium leading-[1.35] tracking-[0.125rem] uppercase text-white"
          >
            {{ event.title }}
          </h2>
          <p
            v-if="event.description"
            class="text-sm font-normal leading-normal text-[#8b8b8b]"
          >
            {{ event.description }}
          </p>
        </div>

        <div class="flex flex-col">
          <div
            v-for="item in details"
            :key="item.label"
            class="flex items-start justify-between gap-4 border-b border-[#2a2a2a] px-4 py-3"
          >
            <span class="shrink-0 text-sm font-normal text-[#8b8b8b]">
              {{ item.label }}
            </span>
            <span class="text-right text-sm font-bold text-white">
              {{ item.value }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <template v-if="event" #footer>
      <div class="flex items-center justify-end gap-2">
        <UButton
          label="See Organizer"
          color="neutral"
          class="h-9 cursor-pointer rounded-full bg-[#232323] px-5 text-sm font-medium text-white hover:bg-[#2a2a2a]"
          @click="onViewOrganizer"
        />
        <UButton
          label="Register"
          color="neutral"
          class="h-9 cursor-pointer rounded-full bg-white px-5 text-sm font-medium text-dark hover:bg-white/90"
          @click="onRegister"
        />
      </div>
    </template>
  </USlideover>
</template>
