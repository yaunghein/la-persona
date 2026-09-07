<script setup lang="ts">
import { parseDate } from '@internationalized/date';
import type { DateValue } from '@internationalized/date';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { FormErrorEvent, FormSubmitEvent } from '@nuxt/ui';
import { format, parseISO } from 'date-fns';
import { z } from 'zod';
import type { EventDTO } from '~~/shared/types/event';
import {
  eventTimeOptions,
  formatEventDateValue,
  formatEventTimeValue,
  isEventDateValue,
  isEventTimeValue,
} from '~~/shared/utils/event-datetime';
import {
  EVENT_IMAGE_MAX_BYTES,
  EVENT_MAX_EXTRA_PHOTOS,
  eventImageUpdatePayload,
  toRemoteEventMediaItem,
  type EventMediaItem,
} from '~~/shared/utils/event-media';

const props = defineProps<{
  event?: EventDTO | null;
}>();

const open = defineModel<boolean>('open', { default: false });

const emit = defineEmits<{
  created: [event: EventDTO];
  updated: [event: EventDTO];
  deleted: [id: string];
}>();

const { organizationSlug, withOrganizationQuery } = useOrganizationSlug();
const queryClient = useQueryClient();
const toast = useToast();

const schema = z.object({
  title: z.string().trim().min(1, 'Event name is required'),
  description: z.string().trim().optional().or(z.literal('')),
  location: z.string().trim().min(1, 'Location is required'),
  date: z.string().refine(isEventDateValue, { message: 'Date is required' }),
  startTime: z
    .string()
    .refine(isEventTimeValue, { message: 'Start time is required' }),
  endTime: z
    .string()
    .refine(isEventTimeValue, { message: 'End time is required' }),
  capacity: z.number().int().positive().nullable(),
});

type FormState = z.output<typeof schema>;

const success = ref(false);
const createdEvent = ref<EventDTO | null>(null);
const isDatePickerOpen = ref(false);
const isCapacityEditorOpen = ref(false);
const isDeleteConfirmOpen = ref(false);
const isEdit = computed(() => Boolean(props.event?.id));
const capacityDraft = ref('');
const coverInputRef = ref<HTMLInputElement | null>(null);
const photosInputRef = ref<HTMLInputElement | null>(null);
const cover = ref<EventMediaItem | null>(null);
const photos = ref<EventMediaItem[]>([]);

const state = reactive<FormState>({
  title: '',
  description: '',
  location: '',
  date: '',
  startTime: '18:00',
  endTime: '21:00',
  capacity: null,
});

const timeOptions = eventTimeOptions();
const remainingPhotoSlots = computed(
  () => EVENT_MAX_EXTRA_PHOTOS - photos.value.length
);

const selectedDate = computed<DateValue | null>({
  get() {
    return isEventDateValue(state.date) ? parseDate(state.date) : null;
  },
  set(value) {
    if (!value || Array.isArray(value) || !('year' in value)) return;
    state.date = value.toString();
  },
});

const dateLabel = computed(() => {
  if (!isEventDateValue(state.date)) return 'Select a date';
  return format(parseISO(state.date), 'd MMM yyyy');
});

const formFieldClass =
  '[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white';

const inputUi = {
  base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
};

const selectUi = {
  base: 'h-[47px] w-full rounded-[4px] border border-[#2a2a2a] bg-[#232323] px-4 text-sm text-white',
  content: 'border border-[#2a2a2a] bg-[#171717]',
  item: 'text-white data-[highlighted]:bg-[#232323]',
  value: 'text-white',
  trailingIcon: 'text-[#8b8b8b]',
};

const shareUrl = computed(() => {
  if (!createdEvent.value || !import.meta.client) return '';
  return `${window.location.origin}/platform/${organizationSlug.value}/events/${createdEvent.value.id}`;
});

function createMediaItem(file: File): EventMediaItem {
  return {
    id: crypto.randomUUID(),
    previewUrl: URL.createObjectURL(file),
    source: 'local',
  };
}

function revokePreview(item: EventMediaItem | null) {
  if (item?.source === 'local' && item.previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(item.previewUrl);
  }
}

function isAllowedImage(file: File) {
  const typeOk = file.type === 'image/jpeg' || file.type === 'image/png';
  const sizeOk = file.size <= EVENT_IMAGE_MAX_BYTES;
  return typeOk && sizeOk;
}

function hydrateFromEvent(event: EventDTO) {
  revokePreview(cover.value);
  photos.value.forEach(revokePreview);
  cover.value = toRemoteEventMediaItem(event.coverUrl);
  photos.value = (event.photoUrls ?? []).map(toRemoteEventMediaItem);
  state.title = event.title;
  state.description = event.description ?? '';
  state.location = event.location;
  state.date = formatEventDateValue(event.startsAt);
  state.startTime = formatEventTimeValue(event.startsAt);
  state.endTime = formatEventTimeValue(event.endsAt);
  state.capacity = event.capacity;
  capacityDraft.value = '';
  isDatePickerOpen.value = false;
  isCapacityEditorOpen.value = false;
  isDeleteConfirmOpen.value = false;
  success.value = false;
  createdEvent.value = null;
  if (coverInputRef.value) coverInputRef.value.value = '';
  if (photosInputRef.value) photosInputRef.value.value = '';
}

function resetForm() {
  revokePreview(cover.value);
  photos.value.forEach(revokePreview);
  cover.value = null;
  photos.value = [];
  state.title = '';
  state.description = '';
  state.location = '';
  state.date = '';
  state.startTime = '18:00';
  state.endTime = '21:00';
  state.capacity = null;
  capacityDraft.value = '';
  isDatePickerOpen.value = false;
  isCapacityEditorOpen.value = false;
  isDeleteConfirmOpen.value = false;
  success.value = false;
  createdEvent.value = null;
  if (coverInputRef.value) coverInputRef.value.value = '';
  if (photosInputRef.value) photosInputRef.value.value = '';
}

watch(open, (isOpen) => {
  if (!isOpen) return;
  if (props.event) hydrateFromEvent(props.event);
  else resetForm();
});

function triggerCoverUpload() {
  coverInputRef.value?.click();
}

function triggerPhotosUpload() {
  if (remainingPhotoSlots.value <= 0) return;
  photosInputRef.value?.click();
}

function onCoverChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  if (!isAllowedImage(file)) {
    toast.add({
      title: 'Invalid cover photo',
      description: 'Use a JPEG or PNG up to 5 MB.',
      color: 'warning',
    });
    return;
  }

  revokePreview(cover.value);
  cover.value = createMediaItem(file);
}

function onPhotosChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  if (!files.length) return;

  const accepted: File[] = [];
  for (const file of files) {
    if (accepted.length >= remainingPhotoSlots.value) break;
    if (!isAllowedImage(file)) {
      toast.add({
        title: 'Invalid photo skipped',
        description: `${file.name} must be a JPEG or PNG up to 5 MB.`,
        color: 'warning',
      });
      continue;
    }
    accepted.push(file);
  }

  photos.value = [
    ...photos.value,
    ...accepted.map((file) => createMediaItem(file)),
  ];
}

function removePhoto(id: string) {
  const next: EventMediaItem[] = [];
  for (const item of photos.value) {
    if (item.id === id) {
      revokePreview(item);
    } else {
      next.push(item);
    }
  }
  photos.value = next;
}

function openCapacityEditor() {
  capacityDraft.value = state.capacity === null ? '' : String(state.capacity);
  isCapacityEditorOpen.value = true;
}

function setCapacityLimit() {
  const value = Number(capacityDraft.value);
  if (!Number.isInteger(value) || value <= 0) {
    toast.add({
      title: 'Invalid capacity',
      description: 'Enter a whole number greater than 0.',
      color: 'warning',
    });
    return;
  }

  state.capacity = value;
  isCapacityEditorOpen.value = false;
}

function removeCapacityLimit() {
  state.capacity = null;
  capacityDraft.value = '';
  isCapacityEditorOpen.value = false;
}

function openDeleteConfirm() {
  isDeleteConfirmOpen.value = true;
}

function closeDeleteConfirm() {
  isDeleteConfirmOpen.value = false;
}

const { mutate: createEvent, isPending: isCreating } = useMutation({
  mutationFn: async (payload: FormState) => {
    return await $fetch<EventDTO>('/api/events', {
      method: 'POST',
      query: withOrganizationQuery(),
      body: {
        ...payload,
        description: payload.description || '',
        hasCover: true,
        extraPhotoCount: photos.value.length,
      },
    });
  },
  onSuccess: (created) => {
    createdEvent.value = created;
    success.value = true;
    queryClient.invalidateQueries({
      queryKey: ['events', organizationSlug.value],
    });
    emit('created', created);
  },
  onError: (error: any) => {
    toast.add({
      title: 'Failed to create event',
      description:
        error?.data?.statusMessage ||
        error?.statusMessage ||
        'Please try again.',
      color: 'error',
    });
  },
});

const { mutate: updateEvent, isPending: isUpdating } = useMutation({
  mutationFn: async (payload: FormState) => {
    if (!props.event?.id) {
      throw new Error('Missing event');
    }

    return await $fetch<EventDTO>(`/api/events/${props.event.id}`, {
      method: 'PATCH',
      query: withOrganizationQuery(),
      body: {
        ...payload,
        description: payload.description || '',
        ...eventImageUpdatePayload(cover.value, photos.value),
      },
    });
  },
  onSuccess: (updated) => {
    queryClient.invalidateQueries({
      queryKey: ['events', organizationSlug.value],
    });
    emit('updated', updated);
    open.value = false;
    toast.add({
      title: 'Event updated',
      color: 'success',
    });
  },
  onError: (error: any) => {
    toast.add({
      title: 'Failed to update event',
      description:
        error?.data?.statusMessage ||
        error?.statusMessage ||
        'Please try again.',
      color: 'error',
    });
  },
});

const { mutate: deleteEvent, isPending: isDeleting } = useMutation({
  mutationFn: async () => {
    if (!props.event?.id) {
      throw new Error('Missing event');
    }

    return await $fetch<{ id: string }>(`/api/events/${props.event.id}`, {
      method: 'DELETE',
      query: withOrganizationQuery(),
    });
  },
  onSuccess: (deleted) => {
    queryClient.invalidateQueries({
      queryKey: ['events', organizationSlug.value],
    });
    isDeleteConfirmOpen.value = false;
    emit('deleted', deleted.id);
    open.value = false;
    toast.add({
      title: 'Event deleted',
      color: 'success',
    });
  },
  onError: (error: any) => {
    toast.add({
      title: 'Failed to delete event',
      description:
        error?.data?.statusMessage ||
        error?.statusMessage ||
        'Please try again.',
      color: 'error',
    });
  },
});

const isSubmitting = computed(
  () => isCreating.value || isUpdating.value || isDeleting.value
);

function onSubmit(event: FormSubmitEvent<FormState>) {
  submitForm(event.data);
}

function submitFromFooter() {
  const parsed = schema.safeParse(state);
  if (!parsed.success) {
    toast.add({
      title: 'Please check your form',
      description:
        parsed.error.issues[0]?.message ||
        'Fix the highlighted fields and try again.',
      color: 'warning',
    });
    return;
  }

  submitForm(parsed.data);
}

function submitForm(payload: FormState) {
  if (!cover.value) {
    toast.add({
      title: 'Cover photo required',
      description: isEdit.value
        ? 'Keep or upload a cover photo before updating the event.'
        : 'Upload a cover photo before creating the event.',
      color: 'warning',
    });
    return;
  }

  if (isEdit.value) updateEvent(payload);
  else createEvent(payload);
}

function onFormError(event: FormErrorEvent) {
  const firstErrorId = event.errors[0]?.id;
  if (firstErrorId) {
    document.getElementById(firstErrorId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }

  toast.add({
    title: 'Please check your form',
    description: 'Fix the highlighted fields and try again.',
    color: 'warning',
  });
}

async function copyEventLink() {
  if (!shareUrl.value) return;
  try {
    await navigator.clipboard.writeText(shareUrl.value);
    toast.add({
      title: 'Link copied',
      color: 'success',
    });
  } catch {
    toast.add({
      title: 'Copy failed',
      description: 'Could not copy event link.',
      color: 'error',
    });
  }
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    inset
    :title="isEdit ? 'Edit event' : 'Create an event'"
    close-icon="i-material-symbols:close-small"
    :ui="{
      content: 'bg-[#171717]',
      header: 'border-b-2 border-[#232323] px-6 py-6',
      title: 'text-sm font-medium tracking-[1.4px] text-white uppercase',
      body: 'px-6',
      footer: 'p-6 justify-end!',
    }"
  >
    <template #body>
      <div v-if="success" class="flex h-full items-center justify-center">
        <div
          class="mx-auto flex max-w-60 flex-col items-center justify-center text-center"
        >
          <Icon
            name="i-material-symbols:verified"
            class="size-24 text-[#8BF667]"
          />
          <div
            class="mt-8 mb-4 text-xl font-semibold leading-none tracking-[2px] text-[#8BF667] uppercase"
          >
            Your event is now live
          </div>
          <div class="mb-5 text-sm leading-normal">
            Your event has been successfully created.
          </div>
          <div class="mb-8 text-sm leading-normal text-muted">
            Share the link in your group or community to invite people.
          </div>
          <UButton
            label="Copy Event Link"
            class="cursor-pointer rounded-full px-8 font-semibold"
            size="xl"
            @click="copyEventLink"
          />
        </div>
      </div>

      <UForm
        v-else
        :schema="schema"
        :state="state"
        class="flex flex-col gap-8 py-2 pb-4"
        @submit="onSubmit"
        @error="onFormError"
      >
        <section class="flex flex-col gap-6">
          <div class="space-y-2">
            <p class="text-sm text-white">Cover Photo</p>
            <p class="text-sm text-[#8b8b8b]">
              Suggested ratio 4:3. Max Size 5 MB. JPEG or PNG.
            </p>
          </div>

          <div
            class="relative aspect-4/3 w-full overflow-hidden rounded-lg border border-[#232323]"
            :class="cover ? '' : 'bg-dark/50'"
          >
            <img
              v-if="cover"
              :src="cover.previewUrl"
              alt="Cover photo preview"
              class="size-full object-cover"
            />
            <div class="absolute inset-0 flex items-center justify-center">
              <UButton
                :label="cover ? 'Upload New Photo' : 'Upload Cover Photo'"
                leading-icon="i-lucide-upload"
                color="neutral"
                class="h-9 cursor-pointer rounded-full bg-[#232323] py-2 pr-6 pl-5 text-sm font-medium text-white hover:bg-[#2a2a2a]"
                @click="triggerCoverUpload"
              />
            </div>
            <input
              ref="coverInputRef"
              type="file"
              accept="image/jpeg,image/png"
              class="hidden"
              @change="onCoverChange"
            />
          </div>
        </section>

        <section class="flex flex-col gap-6">
          <div class="space-y-2">
            <p class="text-sm text-white">Add Event Photos</p>
            <p class="text-sm text-[#8b8b8b]">
              Suggested ratio 4:3. Max Size 5 MB for Each. JPEGs or PNGs.
            </p>
          </div>

          <div
            v-if="!photos.length"
            class="relative aspect-4/3 w-full overflow-hidden rounded-lg border border-[#232323] bg-dark/50"
          >
            <div class="absolute inset-0 flex items-center justify-center">
              <UButton
                label="Upload Up to 4 Photos"
                leading-icon="i-lucide-upload"
                color="neutral"
                class="h-9 cursor-pointer rounded-full bg-[#232323] py-2 pr-6 pl-5 text-sm font-medium text-white hover:bg-[#2a2a2a]"
                @click="triggerPhotosUpload"
              />
            </div>
          </div>

          <div v-else class="flex flex-col gap-6">
            <div class="grid grid-cols-2 gap-2">
              <div
                v-for="photo in photos"
                :key="photo.id"
                class="relative aspect-4/3 overflow-hidden rounded-lg"
              >
                <img
                  :src="photo.previewUrl"
                  alt="Event photo preview"
                  class="size-full object-cover"
                />
                <button
                  type="button"
                  class="absolute top-2 right-2 flex size-7 cursor-pointer items-center justify-center rounded-full bg-dark/80 text-white hover:bg-dark"
                  aria-label="Remove photo"
                  @click="removePhoto(photo.id)"
                >
                  <UIcon name="i-lucide-x" class="size-4" />
                </button>
              </div>
            </div>

            <div v-if="remainingPhotoSlots > 0" class="flex justify-center">
              <UButton
                label="Add Photos"
                color="neutral"
                class="h-9 cursor-pointer rounded-full bg-[#232323] px-6 py-2 text-sm font-medium text-white hover:bg-[#2a2a2a]"
                @click="triggerPhotosUpload"
              />
            </div>
          </div>

          <input
            ref="photosInputRef"
            type="file"
            accept="image/jpeg,image/png"
            multiple
            class="hidden"
            @change="onPhotosChange"
          />
        </section>

        <UFormField label="Event Name" name="title" :class="formFieldClass">
          <UInput
            v-model="state.title"
            placeholder="Tech Leaders Networking Night 2026"
            class="w-full"
            :ui="inputUi"
          />
        </UFormField>

        <UFormField
          label="Description"
          name="description"
          :class="formFieldClass"
        >
          <UTextarea
            v-model="state.description"
            placeholder="Describe your event"
            :rows="3"
            class="w-full"
            :ui="{
              base: 'min-h-[66px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
            }"
          />
        </UFormField>

        <UFormField label="Date" name="date" :class="formFieldClass">
          <UPopover
            v-model:open="isDatePickerOpen"
            :content="{ align: 'start', side: 'bottom', sideOffset: 8 }"
            :ui="{
              content: 'border border-[#2a2a2a] bg-[#171717]',
            }"
          >
            <button
              type="button"
              class="flex h-11.75 w-full cursor-pointer items-center justify-between rounded-[4px] border border-[#2a2a2a] bg-[#232323] px-4 text-left text-sm"
              :class="state.date ? 'text-white' : 'text-white/50'"
            >
              <span>{{ dateLabel }}</span>
              <UIcon name="i-lucide-calendar" class="size-5 text-[#8b8b8b]" />
            </button>

            <template #content="{ close }">
              <UCalendar
                v-model="selectedDate"
                class="p-2"
                @update:model-value="() => close()"
              />
            </template>
          </UPopover>
        </UFormField>

        <div class="grid grid-cols-2 gap-3">
          <UFormField
            label="Start Time"
            name="startTime"
            :class="formFieldClass"
          >
            <USelect
              v-model="state.startTime"
              :items="timeOptions"
              value-key="value"
              color="neutral"
              class="w-full"
              :ui="selectUi"
            />
          </UFormField>

          <UFormField label="End Time" name="endTime" :class="formFieldClass">
            <USelect
              v-model="state.endTime"
              :items="timeOptions"
              value-key="value"
              color="neutral"
              class="w-full"
              :ui="selectUi"
            />
          </UFormField>
        </div>

        <UFormField label="Location" name="location" :class="formFieldClass">
          <UInput
            v-model="state.location"
            placeholder="Venue address"
            class="w-full"
            :ui="inputUi"
          />
        </UFormField>

        <div class="flex flex-col gap-3">
          <p class="text-sm font-medium text-white">Capacity</p>
          <button
            type="button"
            class="flex h-11.75 w-full cursor-pointer items-center justify-between rounded-[4px] border border-[#2a2a2a] bg-[#232323] px-4 text-left text-sm text-white"
            @click="openCapacityEditor"
          >
            <span>{{
              state.capacity === null ? 'Unlimited' : state.capacity
            }}</span>
            <UIcon name="i-lucide-pencil" class="size-5 text-[#8b8b8b]" />
          </button>

          <div
            v-if="isCapacityEditorOpen"
            class="flex flex-col gap-4 rounded-[4px] border border-[#2a2a2a] bg-[#232323] p-4"
          >
            <div class="space-y-2">
              <p class="text-sm text-white">Set Capacity Limit</p>
              <p class="text-sm text-[#8b8b8b]">
                No more people can register after the capacity limit is reached.
              </p>
            </div>
            <UInput
              v-model="capacityDraft"
              type="number"
              min="1"
              placeholder="50"
              class="w-full"
              :ui="inputUi"
            />
            <div class="flex items-center justify-end gap-2">
              <UButton
                label="Remove Limit"
                color="neutral"
                class="h-9 cursor-pointer rounded-full bg-transparent px-5 text-sm font-medium text-white hover:bg-white/10! active:hover:bg-white/20!"
                @click="removeCapacityLimit"
              />
              <UButton
                label="Set Limit"
                color="neutral"
                class="h-9 cursor-pointer rounded-full bg-white px-5 text-sm font-medium text-dark hover:bg-white/90"
                @click="setCapacityLimit"
              />
            </div>
          </div>
        </div>
      </UForm>
    </template>

    <template v-if="!success" #footer>
      <div class="flex w-full items-center justify-end gap-4">
        <UButton
          v-if="isEdit"
          label="Delete Event"
          color="neutral"
          variant="ghost"
          :disabled="isSubmitting"
          class="h-9 cursor-pointer rounded-full px-5 text-sm font-medium text-[#8b8b8b] hover:bg-[#232323] hover:text-white"
          @click="openDeleteConfirm"
        />
        <UButton
          :label="isEdit ? 'Update Changes' : 'Create an Event'"
          leading-icon="i-material-symbols:fitbit-check-small"
          color="neutral"
          :loading="isCreating || isUpdating"
          class="h-9 cursor-pointer rounded-full bg-white py-2 pr-6 pl-5 text-sm font-medium text-dark hover:bg-white/90"
          @click="submitFromFooter"
        />
      </div>
    </template>
  </USlideover>

  <UModal
    v-model:open="isDeleteConfirmOpen"
    :close="false"
    :dismissible="!isDeleting"
    :ui="{
      content: 'bg-[#171717] max-w-md',
      title: 'text-white',
      body: 'pt-4',
      footer: 'justify-end gap-2',
    }"
    title="Delete Event?"
  >
    <template #body>
      <p class="text-sm leading-relaxed text-[#bcbcbc]">
        This action cannot be undone. The event
        <span class="font-medium text-white"> "{{ props.event?.title }}" </span>
        will be removed.
      </p>
    </template>
    <template #footer>
      <UButton
        size="xl"
        label="Cancel"
        color="neutral"
        variant="ghost"
        class="rounded-full px-5"
        :disabled="isDeleting"
        @click="closeDeleteConfirm"
      />
      <UButton
        size="xl"
        label="Delete"
        color="error"
        class="rounded-full px-6 font-medium"
        :loading="isDeleting"
        @click="deleteEvent()"
      />
    </template>
  </UModal>
</template>
