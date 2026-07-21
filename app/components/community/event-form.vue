<script setup lang="ts">
import type {
  CommunityEventFormValues,
} from '~~/shared/types/community-events';

const props = defineProps<{
  mode: 'create' | 'edit';
  modelValue: CommunityEventFormValues;
  categoryOptions: { label: string; value: string }[];
  registrationOptions: { label: string; value: string }[];
  approvalOptions: { label: string; value: string }[];
  timeOptions: { label: string; value: string }[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: CommunityEventFormValues];
  submit: [];
  cancel: [];
  delete: [];
}>();

const toast = useToast();
const isInfoOpen = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

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

function triggerUpload() {
  fileInputRef.value?.click();
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  // Mock upload until media API exists — keep favicon placeholder behavior.
  toast.add({
    title: 'Photo selected',
    description: `${file.name} will upload when event media is wired.`,
    color: 'neutral',
  });
  input.value = '';
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
        aria-label="Open create event information"
        @click="openInfo"
      />
    </div>

    <div
      class="flex w-full flex-col gap-8 rounded-lg bg-[#171717] p-6 sm:p-8"
    >
      <section
        class="flex flex-col gap-8 border-b border-[#232323] pb-8"
      >
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
            class="relative aspect-[1/0.75] w-full max-w-90.75 overflow-hidden rounded-lg border border-[#232323]"
          >
            <img
              :src="form.imageUrl"
              alt="Event cover"
              class="size-full object-cover"
            />
            <div class="absolute inset-0 bg-dark/50" />
            <div class="absolute inset-0 flex items-center justify-center">
              <UButton
                label="Upload New Photo"
                leading-icon="i-lucide-upload"
                color="neutral"
                class="h-9 cursor-pointer rounded-full bg-[#232323] py-2 pr-6 pl-5 text-sm font-medium text-white hover:bg-[#2a2a2a]"
                @click="triggerUpload"
              />
            </div>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onFileChange"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
          <UFormField label="Event Name" :class="formFieldClass">
            <UInput
              :model-value="form.title"
              placeholder="Tech Leaders Networking Night 2026"
              class="w-full"
              :ui="inputUi"
              @update:model-value="patch('title', String($event))"
            />
          </UFormField>

          <UFormField label="Category" :class="formFieldClass">
            <USelect
              :model-value="form.category"
              :items="categoryOptions"
              color="neutral"
              class="w-full"
              :ui="selectUi"
              @update:model-value="patch('category', $event as any)"
            />
          </UFormField>
        </div>

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
      </section>

      <section class="flex flex-col gap-8 pb-2">
        <h2
          class="text-xl font-medium tracking-[0.125rem] uppercase text-white"
        >
          Registration Settings
        </h2>

        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
          <UFormField label="Registration" :class="formFieldClass">
            <USelect
              :model-value="form.registration"
              :items="registrationOptions"
              color="neutral"
              class="w-full"
              :ui="selectUi"
              @update:model-value="patch('registration', $event as any)"
            />
          </UFormField>

          <UFormField label="Approval" :class="formFieldClass">
            <USelect
              :model-value="form.approval"
              :items="approvalOptions"
              color="neutral"
              class="w-full"
              :ui="selectUi"
              @update:model-value="patch('approval', $event as any)"
            />
          </UFormField>
        </div>
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
      content:
        'sm:max-w-[480px] rounded-lg border border-[#232323] bg-[#171717]',
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
            Add cover art, schedule, location, and registration rules so members
            know how to join.
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
