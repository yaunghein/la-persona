<script setup lang="ts">
import type { EventDetailSettings } from '~~/shared/types/community-event-detail';

const props = defineProps<{
  modelValue: EventDetailSettings;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: EventDetailSettings];
  submit: [];
  delete: [];
}>();

const registrationOptions = [
  { label: 'Open', value: 'open' },
  { label: 'Closed', value: 'closed' },
  { label: 'Invite Only', value: 'invite_only' },
];

const approvalOptions = [
  { label: 'Everyone', value: 'everyone' },
  { label: 'Manual Approval', value: 'manual' },
];

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

function patch<K extends keyof EventDetailSettings>(
  key: K,
  value: EventDetailSettings[K]
) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}
</script>

<template>
  <div
    class="flex w-full flex-col gap-8 rounded-lg bg-[#171717] p-6 sm:p-8"
  >
    <section class="flex flex-col gap-6">
      <h2
        class="text-xl font-medium tracking-[0.125rem] uppercase text-white"
      >
        Event Settings
      </h2>

      <UFormField label="Event Name" :class="formFieldClass">
        <UInput
          :model-value="modelValue.title"
          placeholder="Event name"
          class="w-full"
          :ui="inputUi"
          @update:model-value="patch('title', String($event))"
        />
      </UFormField>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <UFormField label="Date" :class="formFieldClass">
          <UInput
            :model-value="modelValue.date"
            type="date"
            class="w-full"
            :ui="inputUi"
            @update:model-value="patch('date', String($event))"
          />
        </UFormField>

        <UFormField label="Location" :class="formFieldClass">
          <UInput
            :model-value="modelValue.location"
            placeholder="Venue address"
            class="w-full"
            :ui="inputUi"
            @update:model-value="patch('location', String($event))"
          />
        </UFormField>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <UFormField label="Registration" :class="formFieldClass">
          <USelect
            :model-value="modelValue.registration"
            :items="registrationOptions"
            color="neutral"
            class="w-full"
            :ui="selectUi"
            @update:model-value="patch('registration', $event as EventDetailSettings['registration'])"
          />
        </UFormField>

        <UFormField label="Approval" :class="formFieldClass">
          <USelect
            :model-value="modelValue.approval"
            :items="approvalOptions"
            color="neutral"
            class="w-full"
            :ui="selectUi"
            @update:model-value="patch('approval', $event as EventDetailSettings['approval'])"
          />
        </UFormField>
      </div>
    </section>

    <div
      class="flex flex-col-reverse items-stretch justify-end gap-2.5 sm:flex-row sm:items-center"
    >
      <UButton
        label="Delete Event"
        leading-icon="i-lucide-trash-2"
        color="neutral"
        variant="ghost"
        class="h-9 cursor-pointer justify-center rounded-full py-2 pr-6 pl-5 text-sm font-medium text-[#8b8b8b] hover:bg-[#232323] hover:text-white"
        @click="emit('delete')"
      />
      <UButton
        label="Update Changes"
        leading-icon="i-material-symbols:fitbit-check-small"
        color="neutral"
        class="h-9 cursor-pointer justify-center rounded-full bg-white py-2 pr-6 pl-5 text-sm font-medium text-dark hover:bg-white/90"
        @click="emit('submit')"
      />
    </div>
  </div>
</template>
