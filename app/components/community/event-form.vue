<script setup lang="ts">
import type { CommunityEventFormValues } from '~~/shared/types/community-events';

const props = defineProps<{
  mode: 'create' | 'edit';
  modelValue: CommunityEventFormValues;
  timeOptions: { label: string; value: string }[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: CommunityEventFormValues];
  submit: [];
  cancel: [];
  delete: [];
}>();

const isInfoOpen = ref(false);

const form = computed({
  get: () => props.modelValue,
  set: (value: CommunityEventFormValues) => emit('update:modelValue', value),
});

function patch<K extends keyof CommunityEventFormValues>(
  key: K,
  value: CommunityEventFormValues[K]
) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}

const pageTitle = computed(() =>
  props.mode === 'create' ? 'Create an Event' : 'Edit Event'
);

const primaryLabel = computed(() =>
  props.mode === 'create' ? 'Create Event' : 'Update Changes'
);

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

function openInfo() {
  isInfoOpen.value = true;
}

function closeInfo() {
  isInfoOpen.value = false;
}

function onCapacityInput(value: string | number) {
  const raw = String(value).trim();
  if (!raw) {
    patch('capacity', null);
    return;
  }
  const parsed = Number(raw);
  patch('capacity', Number.isInteger(parsed) && parsed > 0 ? parsed : null);
}
</script>

<template>
  <div class="flex min-h-[calc(100dvh-11rem)] flex-col gap-8 pb-8">
    <div class="flex items-center gap-3">
      <h1
        class="text-xl font-normal leading-5 tracking-[0.175rem] uppercase text-white sm:text-[1.75rem]"
      >
        {{ pageTitle }}
      </h1>
      <UButton
        icon="i-material-symbols:info-outline"
        color="neutral"
        variant="ghost"
        class="size-5 cursor-pointer p-0 text-white hover:bg-transparent"
        aria-label="Open event information"
        @click="openInfo"
      />
    </div>

    <div class="flex w-full flex-col gap-8 rounded-lg bg-[#171717] p-6 sm:p-8">
      <section class="flex flex-col gap-8 border-b border-[#232323] pb-8">
        <div class="space-y-4">
          <h2
            class="text-xl font-medium tracking-[0.125rem] uppercase text-white"
          >
            Event Details
          </h2>
          <p class="text-sm text-[#8b8b8b]">
            Basic information about the event.
          </p>
        </div>

        <div class="flex flex-col gap-3">
          <p class="text-sm font-medium text-white">Cover Image</p>
          <div
            class="relative aspect-4/3 w-full max-w-90.75 overflow-hidden rounded-lg border border-[#232323]"
          >
            <img
              v-if="form.coverUrl"
              :src="form.coverUrl"
              alt="Event cover"
              class="size-full object-cover"
            />
          </div>
        </div>

        <UFormField label="Event Name" :class="formFieldClass">
          <UInput
            :model-value="form.title"
            placeholder="Tech Leaders Networking Night 2026"
            class="w-full"
            :ui="inputUi"
            @update:model-value="patch('title', String($event))"
          />
        </UFormField>

        <UFormField label="Description" :class="formFieldClass">
          <UTextarea
            :model-value="form.description"
            placeholder="Describe your event"
            :rows="3"
            class="w-full"
            :ui="{
              base: 'min-h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
            }"
            @update:model-value="patch('description', String($event))"
          />
        </UFormField>

        <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
          <UFormField label="Date" :class="formFieldClass">
            <UInput
              :model-value="form.date"
              type="date"
              class="w-full"
              :ui="inputUi"
              @update:model-value="patch('date', String($event))"
            />
          </UFormField>

          <UFormField label="Start Time" :class="formFieldClass">
            <USelect
              :model-value="form.startTime"
              :items="timeOptions"
              color="neutral"
              class="w-full"
              :ui="selectUi"
              @update:model-value="patch('startTime', String($event))"
            />
          </UFormField>

          <UFormField label="End Time" :class="formFieldClass">
            <USelect
              :model-value="form.endTime"
              :items="timeOptions"
              color="neutral"
              class="w-full"
              :ui="selectUi"
              @update:model-value="patch('endTime', String($event))"
            />
          </UFormField>
        </div>

        <UFormField label="Location" :class="formFieldClass">
          <UInput
            :model-value="form.location"
            placeholder="Venue address"
            class="w-full"
            :ui="inputUi"
            @update:model-value="patch('location', String($event))"
          />
        </UFormField>

        <UFormField label="Capacity" :class="formFieldClass">
          <UInput
            :model-value="form.capacity ?? ''"
            type="number"
            min="1"
            placeholder="Unlimited"
            class="w-full"
            :ui="inputUi"
            @update:model-value="onCapacityInput($event as string | number)"
          />
        </UFormField>
      </section>

      <div
        class="flex flex-col-reverse items-stretch justify-end gap-2.5 sm:flex-row sm:items-center"
      >
        <UButton
          v-if="mode === 'edit'"
          label="Delete Event"
          leading-icon="i-lucide-trash-2"
          color="neutral"
          variant="ghost"
          class="h-9 cursor-pointer justify-center rounded-full py-2 pr-6 pl-5 text-sm font-medium text-[#8b8b8b] hover:bg-[#232323] hover:text-white"
          @click="emit('delete')"
        />
        <UButton
          label="Cancel"
          leading-icon="i-lucide-undo-2"
          color="neutral"
          class="h-9 cursor-pointer justify-center rounded-full bg-[#232323] py-2 pr-6 pl-5 text-sm font-medium text-white hover:bg-[#2a2a2a]"
          @click="emit('cancel')"
        />
        <UButton
          :label="primaryLabel"
          :leading-icon="
            mode === 'create'
              ? 'i-material-symbols:add'
              : 'i-material-symbols:fitbit-check-small'
          "
          color="neutral"
          class="h-9 cursor-pointer justify-center rounded-full bg-white py-2 pr-6 pl-5 text-sm font-medium text-dark hover:bg-white/90"
          @click="emit('submit')"
        />
      </div>
    </div>
  </div>

  <UModal
    v-model:open="isInfoOpen"
    title="About events"
    :ui="{
      content: 'sm:max-w-[480px] rounded-lg bg-[#171717]',
      title: 'text-sm font-medium uppercase tracking-widest text-white',
      body: 'px-5 py-4 sm:px-6 sm:py-5',
    }"
  >
    <template #body>
      <div class="space-y-5">
        <div class="space-y-2">
          <h3
            class="text-lg font-medium tracking-widest uppercase text-white sm:text-xl"
          >
            Event setup
          </h3>
          <p class="text-sm leading-relaxed text-[#8b8b8b]">
            Add cover art, schedule, location, and capacity so members know how
            to join.
          </p>
        </div>
        <div class="flex justify-end">
          <UButton
            label="Understood"
            color="neutral"
            class="h-10 rounded-full bg-white px-5 font-medium text-dark hover:bg-white/90"
            @click="closeInfo"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
