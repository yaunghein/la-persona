<script setup lang="ts">
import type { CommunitySettingsFormValues } from '~~/shared/types/community-settings';

const props = defineProps<{
  modelValue: CommunitySettingsFormValues;
  saving?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: CommunitySettingsFormValues];
  submit: [];
  delete: [];
}>();

const toast = useToast();
const isInfoOpen = ref(false);

const form = computed({
  get: () => props.modelValue,
  set: (value: CommunitySettingsFormValues) => emit('update:modelValue', value),
});

function patch<K extends keyof CommunitySettingsFormValues>(
  key: K,
  value: CommunitySettingsFormValues[K]
) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}

const formFieldClass =
  '[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white';

const inputUi = {
  base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
};

function openInfo() {
  isInfoOpen.value = true;
}

function closeInfo() {
  isInfoOpen.value = false;
}

function onUploadClick() {
  toast.add({
    title: 'Images are fixed for now',
    description: 'Cover and logo uploads are not wired yet.',
    color: 'neutral',
  });
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="flex items-center gap-3">
      <h1
        class="text-xl font-normal leading-5 tracking-[0.175rem] uppercase text-white sm:text-[1.75rem]"
      >
        Community Settings
      </h1>
      <UButton
        icon="i-material-symbols:info-outline"
        color="neutral"
        variant="ghost"
        class="size-5 cursor-pointer p-0 text-white hover:bg-transparent"
        aria-label="Open community settings information"
        @click="openInfo"
      />
    </div>

    <div
      class="flex w-full flex-col gap-8 rounded-lg bg-[#171717] p-6 pb-10 sm:p-8 sm:pb-12"
    >
      <section class="flex flex-col gap-8">
        <div class="space-y-4">
          <h2
            class="text-xl font-medium tracking-[0.125rem] uppercase text-white"
          >
            General
          </h2>
          <p class="text-sm text-[#8b8b8b]">Basic organization information.</p>
        </div>

        <div class="flex flex-col gap-3">
          <p class="text-sm font-medium text-white">Cover Image</p>
          <div
            class="relative aspect-[1/0.25] w-full overflow-hidden rounded-lg border border-[#232323] bg-dark"
          >
            <img
              v-if="form.coverImageUrl"
              :src="form.coverImageUrl"
              alt="Community cover"
              class="size-full object-cover"
            />
            <div class="absolute inset-0 flex items-center justify-center">
              <UButton
                label="Upload Photo"
                leading-icon="i-lucide-upload"
                color="neutral"
                class="h-9 cursor-pointer rounded-full bg-[#232323] py-2 pr-6 pl-4 text-sm font-medium text-white hover:bg-[#2a2a2a]"
                @click="onUploadClick"
              />
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <p class="text-sm font-medium text-white">Organization Logo</p>
          <div class="flex flex-wrap items-center gap-4">
            <div
              class="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#232323]"
            >
              <img
                v-if="form.logoUrl"
                :src="form.logoUrl"
                alt="Organization logo"
                class="size-full object-cover"
              />
              <UIcon
                v-else
                name="i-lucide-building-2"
                class="size-10 text-[#8b8b8b]"
              />
            </div>
            <UButton
              label="Upload Photo"
              leading-icon="i-lucide-upload"
              color="neutral"
              class="h-9 cursor-pointer rounded-full bg-[#232323] py-2 pr-6 pl-4 text-sm font-medium text-white hover:bg-[#2a2a2a]"
              @click="onUploadClick"
            />
          </div>
        </div>

        <UFormField label="Organization Name" :class="formFieldClass">
          <UInput
            :model-value="form.name"
            placeholder="Yangon Runners Club"
            class="w-full"
            :ui="inputUi"
            @update:model-value="patch('name', String($event))"
          />
        </UFormField>

        <UFormField label="Description" :class="formFieldClass">
          <CommunityRichTextEditor
            :model-value="form.description"
            placeholder="Describe your community"
            @update:model-value="patch('description', $event)"
          />
        </UFormField>

        <UFormField label="Community Guidelines" :class="formFieldClass">
          <CommunityRichTextEditor
            :model-value="form.guidelines"
            placeholder="Add community guidelines"
            @update:model-value="patch('guidelines', $event)"
          />
        </UFormField>

        <UFormField label="Why Should People Join" :class="formFieldClass">
          <CommunityRichTextEditor
            :model-value="form.whyJoin"
            placeholder="Tell people why they should join"
            @update:model-value="patch('whyJoin', $event)"
          />
        </UFormField>
      </section>

      <div
        class="flex flex-col-reverse items-stretch justify-end gap-2.5 sm:flex-row sm:items-center"
      >
        <UButton
          label="Delete Community"
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
          :loading="saving"
          class="h-9 cursor-pointer justify-center rounded-full bg-white py-2 pr-6 pl-5 text-sm font-medium text-dark hover:bg-white/90"
          :ui="{
            leadingIcon: 'size-6',
          }"
          @click="emit('submit')"
        />
      </div>
    </div>
  </div>

  <UModal
    v-model:open="isInfoOpen"
    title="About settings"
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
            Community settings
          </h3>
          <p class="text-sm leading-relaxed text-[#8b8b8b]">
            Update your community name, description, guidelines, and why people
            should join.
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
