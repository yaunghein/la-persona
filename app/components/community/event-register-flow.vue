<script setup lang="ts">
import type { EventDTO, EventOrganizer } from '~~/shared/types/event';
import {
  formatEventTimeLabel,
  formatEventWeekdayDateLabel,
} from '~~/shared/utils/event-datetime';
import { eventGalleryImages } from '~~/shared/utils/event-media';

const props = withDefaults(
  defineProps<{
    event: EventDTO;
    organizer?: EventOrganizer | null;
    variant?: 'slideover' | 'page';
  }>(),
  { variant: 'slideover' }
);

const isPage = computed(() => props.variant === 'page');

const emit = defineEmits<{
  viewOrganizer: [event: EventDTO];
  register: [event: EventDTO];
  completed: [];
  stepChange: [step: RegisterStep];
}>();

type RegisterStep = 'confirm' | 'registering' | 'success';

const step = ref<RegisterStep>('confirm');
let registeringTimer: ReturnType<typeof setTimeout> | null = null;

const galleryImages = computed(() =>
  eventGalleryImages(props.event.coverUrl, props.event.photoUrls)
);

const details = computed(() => {
  const rows: { label: string; value: string }[] = [
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

  if (props.event.capacity != null && !isPage.value) {
    rows.push({
      label: 'Capacity',
      value: `0/${props.event.capacity}`,
    });
  }

  return rows;
});

const spotsLabel = computed(() => {
  const capacity = props.event.capacity;
  if (capacity == null) return '';
  const spots = Math.max(capacity, 0);
  return `${spots} spot${spots === 1 ? '' : 's'} available`;
});

function clearRegisteringTimer() {
  if (!registeringTimer) return;
  clearTimeout(registeringTimer);
  registeringTimer = null;
}

function resetStep() {
  clearRegisteringTimer();
  step.value = 'confirm';
}

function startRegister() {
  if (step.value !== 'confirm') return;

  if (isPage.value) {
    emit('register', props.event);
    return;
  }

  step.value = 'registering';
  clearRegisteringTimer();
  registeringTimer = setTimeout(() => {
    step.value = 'success';
    registeringTimer = null;
  }, 2000);
}

function onViewOrganizer() {
  emit('viewOrganizer', props.event);
}

function onGotIt() {
  emit('completed');
  if (!isPage.value) resetStep();
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
        :class="isPage ? 'max-w-120 sm:max-w-140' : ''"
      >
        <div
          class="relative aspect-[1/0.75] w-full overflow-hidden rounded-lg bg-[#232323]"
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

        <div class="flex flex-col gap-6">
          <div class="flex flex-col gap-4">
            <h1
              class="text-xl font-medium leading-[1.35] tracking-[0.125rem] uppercase text-white"
            >
              {{ event.title }}
            </h1>
            <p
              v-if="event.description"
              class="text-sm font-normal leading-normal text-[#8b8b8b]"
            >
              {{ event.description }}
            </p>
          </div>

          <div class="flex flex-col divide-y divide-[#2a2a2a]">
            <div
              v-for="item in details"
              :key="item.label"
              class="flex items-start justify-between gap-4 px-4 py-3"
            >
              <span class="shrink-0 text-sm font-normal text-[#8b8b8b]">
                {{ item.label }}
              </span>
              <span class="text-right text-sm text-white">
                {{ item.value }}
              </span>
            </div>
            <div
              v-if="organizer?.name"
              class="flex items-center justify-between gap-4 px-4 py-3"
            >
              <span class="shrink-0 text-sm font-normal text-[#8b8b8b]">
                Organizer
              </span>
              <div class="flex min-w-0 items-center justify-end gap-2">
                <UAvatar
                  :src="organizer.logoUrl || undefined"
                  :alt="organizer.name"
                  icon="i-lucide-users"
                  :ui="{
                    root: 'size-6 bg-[#232323]',
                    icon: 'size-3 text-[#8b8b8b]',
                  }"
                />
                <span class="text-right text-sm text-white">
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
        <p class="text-sm leading-normal text-white">
          You're registered for
          <span class="font-bold">{{ event.title }}.</span>
          We'll send you a reminder before the event.
        </p>
      </div>
    </div>

    <div
      class="shrink-0 border-t border-[#2a2a2a] p-6"
      :class="[
        step === 'success' ? 'pt-8 pb-4' : '',
        isPage ? 'sm:px-8 sm:py-6 lg:px-16' : '',
      ]"
    >
      <div
        class="mx-auto flex w-full flex-col items-center"
        :class="[
          step === 'success' ? 'gap-8' : 'gap-6',
          isPage ? 'max-w-120 sm:max-w-140' : '',
        ]"
      >
        <template v-if="step !== 'success'">
          <UButton
            v-if="step === 'confirm'"
            color="neutral"
            block
            class="h-13 cursor-pointer rounded-full bg-white px-2.5 hover:bg-white/90"
            :ui="{
              base: 'flex-col gap-1',
              label:
                'flex flex-col items-center gap-1 whitespace-normal text-center',
            }"
            @click="startRegister"
          >
            <span class="text-sm font-bold leading-[1.1] text-dark">
              Register
            </span>
            <span
              v-if="spotsLabel && !isPage"
              class="text-[0.6875rem] font-semibold tracking-[0.55px] text-[#ff3113]"
            >
              {{ spotsLabel }}
            </span>
          </UButton>
          <UButton
            v-else
            label="Registering..."
            color="neutral"
            disabled
            class="h-13 w-full justify-center rounded-full bg-[#232323] px-2.5 text-sm font-bold text-[#8b8b8b] disabled:opacity-100"
          />
          <button
            type="button"
            class="cursor-pointer text-sm font-bold text-white underline"
            @click="onViewOrganizer"
          >
            See Organizer
          </button>
        </template>
        <UButton
          v-else
          label="Got it"
          color="neutral"
          class="h-13 w-full cursor-pointer justify-center rounded-full bg-[#232323] px-2.5 text-sm font-bold text-white hover:bg-[#2a2a2a]"
          @click="onGotIt"
        />
        <PoweredByLaPersona />
      </div>
    </div>
  </div>
</template>
