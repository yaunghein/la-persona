<script setup lang="ts">
import type { CommunitySettingsFormValues } from '~~/shared/contracts/organization';

const props = defineProps<{
  modelValue: CommunitySettingsFormValues;
  /** Organizers with a community card; only they can be the contact. */
  organizers: {
    id: string;
    name: string;
    title: string;
    avatarUrl: string | null;
  }[];
  saving?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: CommunitySettingsFormValues];
  submit: [];
}>();

const toast = useToast();
const { organizationSlug } = useOrganizationSlug();
const isInfoOpen = ref(false);
const isUploadingImage = ref(false);
const selectedLogoFile = ref<File | null>(null);
const localLogoPreviewUrl = ref<string | null>(null);
const selectedCoverFile = ref<File | null>(null);
const localCoverPreviewUrl = ref<string | null>(null);

function resolveMediaUrl(value: string) {
  if (!value) return null;
  if (
    value.startsWith('http') ||
    value.startsWith('blob:') ||
    value.startsWith('/')
  ) {
    return value;
  }

  return resolveObjectStorageUrl(value);
}

const displayLogo = computed(() => {
  if (localLogoPreviewUrl.value) return localLogoPreviewUrl.value;
  return communityLogoSrc(
    resolveMediaUrl(props.modelValue.logoUrl),
    props.modelValue.name
  );
});
const displayCover = computed(() => {
  if (localCoverPreviewUrl.value) return localCoverPreviewUrl.value;
  return communityCoverSrc(resolveMediaUrl(props.modelValue.coverImageUrl));
});

const organizerItems = computed(() =>
  props.organizers.map((organizer) => ({
    label: organizer.name,
    value: organizer.id,
    description: organizer.title,
    avatar: {
      src: resolveMediaUrl(organizer.avatarUrl ?? '') ?? undefined,
      alt: organizer.name,
    },
  }))
);

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
  '[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink';

const inputUi = {
  base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
};

const selectUi = {
  base: 'h-[47px] w-full rounded-[4px] border border-line bg-raised px-4 text-sm text-ink',
  content: 'border border-line bg-surface',
  item: 'text-ink data-[highlighted]:bg-raised',
  itemDescription: 'text-subtle',
  value: 'text-ink',
  placeholder: 'text-ink/50',
  trailingIcon: 'text-subtle',
};

function openInfo() {
  isInfoOpen.value = true;
}

function closeInfo() {
  isInfoOpen.value = false;
}

function triggerFilePicker(inputId: string) {
  const input = document.getElementById(inputId) as HTMLInputElement | null;
  input?.click();
}

function takeImageFile(event: Event, label: string) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return null;

  if (!file.type.startsWith('image/')) {
    toast.add({
      title: 'Choose an image',
      description: `${label} uploads accept JPG, PNG, or WebP.`,
      color: 'warning',
    });
    input.value = '';
    return null;
  }

  return file;
}

function onCoverFileChange(event: Event) {
  const file = takeImageFile(event, 'Cover');
  if (!file) return;
  if (localCoverPreviewUrl.value)
    URL.revokeObjectURL(localCoverPreviewUrl.value);
  selectedCoverFile.value = file;
  localCoverPreviewUrl.value = URL.createObjectURL(file);
}

function onLogoFileChange(event: Event) {
  const file = takeImageFile(event, 'Logo');
  if (!file) return;
  if (localLogoPreviewUrl.value) URL.revokeObjectURL(localLogoPreviewUrl.value);
  selectedLogoFile.value = file;
  localLogoPreviewUrl.value = URL.createObjectURL(file);
}

function clearFileSelection(
  previewUrl: Ref<string | null>,
  selectedFile: Ref<File | null>,
  inputId: string
) {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  selectedFile.value = null;
  previewUrl.value = null;
  const input = document.getElementById(inputId) as HTMLInputElement | null;
  if (input) input.value = '';
}

async function uploadSettingsImage(
  file: File,
  options: { maxSizeMB: number; maxWidthOrHeight: number }
) {
  const fileKey = await uploadImage(
    file,
    { organizationSlug: organizationSlug.value },
    options
  );
  return resolveMediaUrl(fileKey);
}

async function onUpdate() {
  isUploadingImage.value = true;
  try {
    if (selectedLogoFile.value) {
      const logoUrl = await uploadSettingsImage(selectedLogoFile.value, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1200,
      });
      if (!logoUrl) throw new Error('Upload failed');
      patch('logoUrl', logoUrl);
      clearFileSelection(
        localLogoPreviewUrl,
        selectedLogoFile,
        'community-logo-input'
      );
    }

    if (selectedCoverFile.value) {
      const coverImageUrl = await uploadSettingsImage(selectedCoverFile.value, {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 2400,
      });
      if (!coverImageUrl) throw new Error('Upload failed');
      patch('coverImageUrl', coverImageUrl);
      clearFileSelection(
        localCoverPreviewUrl,
        selectedCoverFile,
        'community-cover-input'
      );
    }
  } catch (error: any) {
    toast.add({
      title: 'Upload failed',
      description:
        error?.data?.statusMessage ||
        error?.message ||
        'Could not upload the image.',
      color: 'error',
    });
    return;
  } finally {
    isUploadingImage.value = false;
  }

  emit('submit');
}

onUnmounted(() => {
  if (localLogoPreviewUrl.value) URL.revokeObjectURL(localLogoPreviewUrl.value);
  if (localCoverPreviewUrl.value)
    URL.revokeObjectURL(localCoverPreviewUrl.value);
});
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="flex items-center gap-3">
      <h1
        class="text-xl font-normal leading-tight tracking-widest uppercase text-ink sm:text-2xl"
      >
        Community Settings
      </h1>
      <UButton
        icon="i-material-symbols:info-outline"
        color="neutral"
        variant="ghost"
        class="size-5 cursor-pointer p-0 text-ink hover:bg-transparent"
        aria-label="Open community settings information"
        @click="openInfo"
      />
    </div>

    <div
      class="flex w-full flex-col gap-8 rounded-lg bg-surface p-6 pb-8 sm:p-8"
    >
      <section class="flex flex-col gap-8">
        <div class="flex flex-col gap-3">
          <p class="text-sm font-medium text-ink">Cover Image</p>
          <div
            class="relative aspect-[1/0.25] w-full overflow-hidden rounded-lg border border-raised bg-canvas"
          >
            <img
              v-if="localCoverPreviewUrl"
              :src="localCoverPreviewUrl"
              alt=""
              class="size-full object-cover"
            />
            <UiSkeletonImage
              v-else-if="displayCover"
              :src="displayCover"
              alt=""
              width="1024"
              class="size-full object-cover"
            />
            <div class="absolute inset-0 flex items-center justify-center">
              <input
                id="community-cover-input"
                type="file"
                class="hidden"
                accept="image/*"
                @change="onCoverFileChange"
              />
              <UButton
                label="Upload Photo"
                leading-icon="i-lucide-upload"
                color="neutral"
                size="sm"
                class="h-8 cursor-pointer rounded-full bg-raised/90 pr-4 pl-3 text-xs font-medium text-ink hover:bg-line"
                @click="triggerFilePicker('community-cover-input')"
              />
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <p class="text-sm font-medium text-ink">Organization Logo</p>
          <div class="flex flex-wrap items-center gap-4">
            <div
              class="flex size-16 shrink-0 sm:size-24 items-center justify-center overflow-hidden rounded-full bg-raised"
            >
              <img
                v-if="localLogoPreviewUrl"
                :src="localLogoPreviewUrl"
                :alt="form.name || 'Organization logo'"
                class="size-full object-cover"
              />
              <UiSkeletonImage
                v-else
                :src="displayLogo"
                :alt="form.name || 'Organization logo'"
                width="96"
                height="96"
                class="size-full object-cover"
              />
            </div>
            <input
              id="community-logo-input"
              type="file"
              class="hidden"
              accept="image/*"
              @change="onLogoFileChange"
            />
            <UButton
              label="Upload Photo"
              leading-icon="i-lucide-upload"
              color="neutral"
              size="sm"
              class="h-8 cursor-pointer rounded-full bg-raised pr-4 pl-3 text-xs font-medium text-ink hover:bg-line"
              @click="triggerFilePicker('community-logo-input')"
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
          <UiRichTextEditor
            :model-value="form.description"
            placeholder="Describe your community"
            @update:model-value="patch('description', $event)"
          />
        </UFormField>

        <UFormField label="Community Guidelines" :class="formFieldClass">
          <UiRichTextEditor
            :model-value="form.guidelines"
            placeholder="Add community guidelines"
            @update:model-value="patch('guidelines', $event)"
          />
        </UFormField>

        <UFormField label="Why Should People Join" :class="formFieldClass">
          <UiRichTextEditor
            :model-value="form.whyJoin"
            placeholder="Tell people why they should join"
            @update:model-value="patch('whyJoin', $event)"
          />
        </UFormField>

        <UFormField
          label="Contact Organizer"
          :description="'Whose card people see when they tap Contact Organizer on your events and About page. Leave it empty to hide the button. Only organizers with a community card are\u00A0listed.'"
          :class="formFieldClass"
          :ui="{ description: 'mb-2 max-w-lg text-sm text-subtle' }"
        >
          <USelectMenu
            :model-value="form.organizerMemberId || undefined"
            :items="organizerItems"
            value-key="value"
            placeholder="No contact organizer"
            :search-input="false"
            clear
            color="neutral"
            class="w-full"
            :ui="selectUi"
            @update:model-value="patch('organizerMemberId', $event ?? '')"
          />
        </UFormField>
      </section>

      <div
        class="flex flex-col-reverse items-stretch justify-end gap-2.5 sm:flex-row sm:items-center"
      >
        <UButton
          label="Update Changes"
          leading-icon="i-lucide-check"
          color="neutral"
          :loading="saving || isUploadingImage"
          class="h-10 cursor-pointer justify-center rounded-full bg-ink pr-6 pl-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
          @click="onUpdate"
        />
      </div>
    </div>
  </div>

  <UModal
    v-model:open="isInfoOpen"
    title="About settings"
    :ui="{
      content: 'sm:max-w-120 rounded-lg bg-surface',
      title: 'text-sm font-medium uppercase tracking-widest text-ink',
      body: 'px-5 py-4 sm:px-6 sm:py-5',
    }"
  >
    <template #body>
      <div class="space-y-5">
        <div class="space-y-2">
          <h3
            class="text-lg font-medium tracking-widest uppercase text-ink sm:text-xl"
          >
            Community settings
          </h3>
          <p class="text-sm leading-relaxed text-subtle">
            Update your community name, description, brand card assets, and why
            people should join.
          </p>
        </div>
        <div class="flex justify-end">
          <UButton
            label="Understood"
            color="neutral"
            class="h-10 text-sm rounded-full bg-ink px-5 font-medium text-ink-inverse hover:bg-ink/90"
            @click="closeInfo"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
