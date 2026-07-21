<script setup lang="ts">
import type {
  CommunityJoinPolicy,
  CommunitySettingsFormValues,
} from '~~/shared/types/community-settings';

const props = defineProps<{
  modelValue: CommunitySettingsFormValues;
  joinOptions: { label: string; value: CommunityJoinPolicy }[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: CommunitySettingsFormValues];
  submit: [];
  cancel: [];
  delete: [];
}>();

const toast = useToast();
const isInfoOpen = ref(false);
const coverInputRef = ref<HTMLInputElement | null>(null);
const logoInputRef = ref<HTMLInputElement | null>(null);

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

const selectUi = {
  base: 'h-[47px] w-full rounded-[4px] border border-[#2a2a2a] bg-[#232323] px-4 text-sm text-white',
  content: 'border border-[#2a2a2a] bg-[#171717]',
  item: 'text-white data-[highlighted]:bg-[#232323]',
  value: 'text-white',
  trailingIcon: 'text-[#8b8b8b]',
};

const notificationItems = [
  {
    key: 'notifyNewMember' as const,
    label: 'New member joins',
  },
  {
    key: 'notifyMembershipRequests' as const,
    label: 'Membership requests',
  },
  {
    key: 'notifyEventRegistrations' as const,
    label: 'Event registrations',
  },
];

function openInfo() {
  isInfoOpen.value = true;
}

function closeInfo() {
  isInfoOpen.value = false;
}

function triggerCoverUpload() {
  coverInputRef.value?.click();
}

function triggerLogoUpload() {
  logoInputRef.value?.click();
}

function onFileSelected(kind: 'cover' | 'logo', event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  toast.add({
    title: 'Photo selected',
    description: `${file.name} will upload when community media is wired.`,
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

    <div class="flex w-full flex-col gap-8 rounded-lg bg-[#171717] p-6 sm:p-8">
      <section class="flex flex-col gap-8 border-b border-[#232323] pb-8">
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
                @click="triggerCoverUpload"
              />
            </div>
            <input
              ref="coverInputRef"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onFileSelected('cover', $event)"
            />
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
              @click="triggerLogoUpload"
            />
            <input
              ref="logoInputRef"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onFileSelected('logo', $event)"
            />
          </div>
        </div>

        <UFormField label="Organization Name" :class="formFieldClass">
          <UInput
            :model-value="form.name"
            placeholder="Tech Leaders Myanmar"
            class="w-full"
            :ui="inputUi"
            @update:model-value="patch('name', String($event))"
          />
        </UFormField>

        <UFormField label="Description" :class="formFieldClass">
          <UTextarea
            :model-value="form.description"
            placeholder="Describe your community"
            :rows="3"
            class="w-full"
            :ui="{
              base: 'min-h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
            }"
            @update:model-value="patch('description', String($event))"
          />
        </UFormField>
      </section>

      <section class="flex flex-col gap-8 border-b border-[#232323] pb-8">
        <div class="space-y-4">
          <h2
            class="text-xl font-medium tracking-[0.125rem] uppercase text-white"
          >
            Membership
          </h2>
          <p class="text-sm text-[#8b8b8b]">
            Control how people join your organization.
          </p>
        </div>

        <UFormField label="Who can join?" :class="formFieldClass">
          <USelect
            :model-value="form.whoCanJoin"
            :items="joinOptions"
            color="neutral"
            class="w-full"
            :ui="selectUi"
            @update:model-value="patch('whoCanJoin', $event as CommunityJoinPolicy)"
          />
        </UFormField>
      </section>

      <section class="flex flex-col gap-8 pb-2">
        <div class="space-y-4">
          <h2
            class="text-xl font-medium tracking-[0.125rem] uppercase text-white"
          >
            Notification
          </h2>
          <p class="text-sm text-[#8b8b8b]">Control community notifications.</p>
        </div>

        <div class="flex flex-col gap-3">
          <p class="text-sm font-medium text-white">Email Notifications</p>
          <div
            class="flex flex-col overflow-hidden rounded-[4px] border border-[#2a2a2a]"
          >
            <label
              v-for="(item, index) in notificationItems"
              :key="item.key"
              class="flex cursor-pointer items-center gap-2 px-4 py-3"
              :class="
                index < notificationItems.length - 1
                  ? 'border-b border-[#2a2a2a]'
                  : ''
              "
            >
              <UCheckbox
                :model-value="form[item.key]"
                color="neutral"
                :ui="{
                  base: 'bg-[#232323] ring-[#2a2a2a] data-[state=checked]:bg-white data-[state=checked]:text-dark',
                }"
                @update:model-value="patch(item.key, Boolean($event))"
              />
              <span class="text-sm text-[#8b8b8b]">{{ item.label }}</span>
            </label>
          </div>
        </div>
      </section>

      <div
        class="flex flex-col-reverse items-stretch justify-end gap-2.5 sm:flex-row sm:items-center"
      >
        <UButton
          label="Delete Community"
          leading-icon="i-lucide-trash-2"
          color="neutral"
          variant="ghost"
          class="h-9 cursor-pointer justify-center rounded-full py-2 pr-6 pl-5 text-sm font-medium text-[#8b8b8b] hover:bg-[#232323] hover:text-white sm:mr-auto"
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
          label="Update Changes"
          leading-icon="i-material-symbols:fitbit-check-small"
          color="neutral"
          class="h-9 cursor-pointer justify-center rounded-full bg-white py-2 pr-6 pl-5 text-sm font-medium text-dark hover:bg-white/90"
          @click="emit('submit')"
        />
      </div>
    </div>
  </div>

  <UModal
    v-model:open="isInfoOpen"
    title="About settings"
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
            Community settings
          </h3>
          <p class="text-sm leading-relaxed text-[#8b8b8b]">
            Update branding, membership rules, and email alerts for your
            community workspace.
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
