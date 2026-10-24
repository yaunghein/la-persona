<script setup lang="ts">
import { Application } from '@splinetool/runtime';
import type { FormError } from '@nuxt/ui';
import { useSortable } from '@vueuse/integrations/useSortable';
import {
  CARD_LINK_SELECT_ITEMS,
  createEmptyCardLink,
} from '~~/shared/constants/card-link-options';
import {
  createLinkTypeItemsWithCustom,
  getCustomSocialLabelMissingIndexes,
  normalizeSocialLinksForForm,
  resolveSocialLinksForSubmission,
  type SocialFormLink,
} from '~~/shared/utils/social-links';
import { applyCombinedCardToSpline } from '~/features/card/utils/spline-card';
import { resolvedPhoneFields } from '~~/shared/utils/phone';

const route = useRoute();
const slug = computed(() => String(route.params.slug || ''));
const orgSlug = computed(() => String(route.params.orgSlug || ''));
const toast = useToast();
const {
  normalizeUrlWithHttps,
  normalizeLinkValuesWithHttps,
  isValidPublicWebUrl,
  isValidCardLinkValue,
} = useUrlNormalization();

const selectedFile = ref<File | null>(null);
const localPreviewUrl = ref<string | null>(null);

const { data: card, isLoading } = useCardQuery(slug);

const {
  state,
  hydrate,
  clear: clearDraft,
} = useFormDraft(`card:${slug.value}:info`, () => ({
  firstName: '',
  lastName: '',
  position: '',
  company: '',
  phone: '',
  phoneCountryCode: 'MM',
  email: '',
  website: '',
  avatarUrl: '',
  socials: [] as SocialFormLink[],
}));
const socialsListEl = ref<HTMLElement | null>(null);
const isSocialSlideoverOpen = ref(false);
const socialEditorMode = ref<'create' | 'edit'>('create');
const editingSocialIndex = ref<number | null>(null);
const pendingDeleteSocialIndex = ref<number | null>(null);
const isDeleteSocialConfirmOpen = ref(false);
const isPreviewModalOpen = ref(false);
const isPreviewLoading = ref(false);
const previewCanvasEl = ref<HTMLCanvasElement | null>(null);
const previewSpline = ref<Application | null>(null);
const socialDraft = reactive<SocialFormLink>({
  ...createEmptyCardLink(),
  customLabel: '',
});
const socialsSortable = computed({
  get: () => state.socials,
  set: (value) => {
    state.socials = value;
  },
});
const linkTypeItems = computed<string[][]>(() =>
  createLinkTypeItemsWithCustom(CARD_LINK_SELECT_ITEMS)
);

const FIELD_LABELS: Record<string, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  position: 'Professional title / role',
  company: 'Company / brand name',
  phone: 'Phone number',
  email: 'Email address',
  website: 'Personal website / portfolio',
  'socialDraft.label': 'Link type',
  'socialDraft.customLabel': 'Custom label',
  'socialDraft.value': 'Link URL',
};

function getErrorFieldLabel(name?: string) {
  if (!name) return 'This field';
  if (name.startsWith('socials.')) return 'Social link';
  return FIELD_LABELS[name] || 'This field';
}

function buildHelpfulFormErrorMessage(
  errors: Array<Pick<FormError, 'name' | 'message'>> = []
) {
  const messages = errors
    .map((error) => {
      const label = getErrorFieldLabel(error.name);
      return error.message ? `${label}: ${error.message}` : '';
    })
    .filter(Boolean);

  return (
    [...new Set(messages)].join(' ') ||
    'Please review the highlighted fields and try again.'
  );
}

function buildHelpfulApiErrorMessage(error: unknown) {
  const messages = apiErrorDetails(error).map(
    (detail) => `${getErrorFieldLabel(detail.field)}: ${detail.message}`
  );
  return messages.length
    ? [...new Set(messages)].join(' ')
    : apiErrorMessage(error, 'Unable to update card. Please try again.');
}

watch(
  card,
  (val) => {
    if (!val) return;
    const incomingSocials = JSON.parse(JSON.stringify(val.socials || [])) as
      | SocialFormLink[]
      | [];
    hydrate({
      firstName: val.firstName ?? '',
      lastName: val.lastName ?? '',
      position: val.position ?? '',
      company: val.company ?? '',
      phone: val.phone ?? '',
      phoneCountryCode: val.phoneCountryCode || 'MM',
      email: val.email ?? '',
      website: val.website ?? '',
      avatarUrl: val.avatarUrl ?? '',
      socials: normalizeSocialLinksForForm(incomingSocials),
    });
  },
  { immediate: true }
);

const displayAvatar = computed(() => {
  if (localPreviewUrl.value) return localPreviewUrl.value;
  if (!state.avatarUrl) return null;
  if (state.avatarUrl.startsWith('http')) return state.avatarUrl;

  return resolveObjectStorageUrl(state.avatarUrl);
});

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (localPreviewUrl.value) URL.revokeObjectURL(localPreviewUrl.value);
  selectedFile.value = file;
  localPreviewUrl.value = URL.createObjectURL(file);
}

function clearSelection() {
  if (localPreviewUrl.value) URL.revokeObjectURL(localPreviewUrl.value);
  selectedFile.value = null;
  localPreviewUrl.value = null;
  const input = document.getElementById('avatar-input') as HTMLInputElement;
  if (input) input.value = '';
}

function removeCurrentPhoto() {
  clearSelection();
  state.avatarUrl = '';
}

const isRemovePhotoConfirmOpen = ref(false);

function openRemovePhotoConfirm() {
  isRemovePhotoConfirmOpen.value = true;
}

function confirmRemovePhoto() {
  if (selectedFile.value) clearSelection();
  else removeCurrentPhoto();
  isRemovePhotoConfirmOpen.value = false;
}

function triggerFilePicker() {
  const input = document.getElementById(
    'avatar-input'
  ) as HTMLInputElement | null;
  input?.click();
}

const { mutateAsync: updateCard } = useUpdateCardMutation(slug);
const isSaving = ref(false);

type CardInfoForm = typeof state;

async function saveCardInfo(form: CardInfoForm) {
  if (!card.value) return;
  isSaving.value = true;
  try {
    const avatarUrl = selectedFile.value
      ? await uploadImage(
          selectedFile.value,
          { organizationSlug: card.value.organization.slug },
          { maxSizeMB: 0.8, maxWidthOrHeight: 1200 }
        )
      : form.avatarUrl;
    // Unchanged photos are left out: one copied from a Google sign-in is not
    // an uploaded image, so sending it back would fail validation.
    const isAvatarChanged = avatarUrl !== (card.value.avatarUrl ?? '');

    await updateCard({
      firstName: form.firstName,
      lastName: form.lastName,
      position: form.position,
      company: form.company,
      email: form.email,
      ...resolvedPhoneFields(form.phone, form.phoneCountryCode),
      website: normalizeUrlWithHttps(form.website),
      ...(isAvatarChanged && { avatarUrl }),
      socials: normalizeLinkValuesWithHttps(
        resolveSocialLinksForSubmission(form.socials)
      ),
    });

    clearSelection();
    clearDraft();
    toast.add({
      title: 'Success',
      description: 'Your card details were updated successfully.',
      color: 'success',
    });
    if (orgSlug.value) {
      await navigateTo(`/platform/${orgSlug.value}/cards`);
    }
  } catch (err: any) {
    toast.add({
      title: 'Unable to update card',
      description: buildHelpfulApiErrorMessage(err),
      color: 'error',
    });
  } finally {
    isSaving.value = false;
  }
}

function onSubmit() {
  saveCardInfo(state);
}

function validate(formData: Partial<CardInfoForm>): FormError[] {
  const errors: FormError[] = [];

  const missingIndexes = getCustomSocialLabelMissingIndexes(state.socials);
  missingIndexes.forEach((index) => {
    errors.push({
      name: `socials.${index}.customLabel`,
      message: 'Custom label is required.',
    });
  });

  const website = String(formData.website || '').trim();
  if (website && !isValidPublicWebUrl(website)) {
    errors.push({
      name: 'website',
      message: 'Please enter a valid URL.',
    });
  }

  return errors;
}

function onFormError(event: any) {
  console.error('Form validation failed:', event.errors);
  toast.add({
    title: 'Please review the form',
    description: buildHelpfulFormErrorMessage(event.errors),
    color: 'error',
  });
}

function resetSocialDraft() {
  socialDraft.label = createEmptyCardLink().label;
  socialDraft.value = '';
  socialDraft.customLabel = '';
}

function openCreateLinkSlideover() {
  socialEditorMode.value = 'create';
  editingSocialIndex.value = null;
  resetSocialDraft();
  isSocialSlideoverOpen.value = true;
}

function openEditLinkSlideover(index: number) {
  const link = state.socials[index];
  if (!link) return;

  socialEditorMode.value = 'edit';
  editingSocialIndex.value = index;
  socialDraft.label = link.label || createEmptyCardLink().label;
  socialDraft.value = link.value || '';
  socialDraft.customLabel = link.customLabel || '';
  isSocialSlideoverOpen.value = true;
}

function closeSocialSlideover() {
  isSocialSlideoverOpen.value = false;
  editingSocialIndex.value = null;
  resetSocialDraft();
}

function resolveSocialLabel(link: SocialFormLink) {
  return link.label === 'Custom' ? link.customLabel || 'Custom' : link.label;
}

function validateSocialDraft(): FormError[] {
  const errors: FormError[] = [];

  if (!String(socialDraft.label || '').trim()) {
    errors.push({
      name: 'socialDraft.label',
      message: 'Please choose a link type.',
    });
  }

  if (
    socialDraft.label === 'Custom' &&
    !String(socialDraft.customLabel || '').trim()
  ) {
    errors.push({
      name: 'socialDraft.customLabel',
      message: 'Custom label is required.',
    });
  }

  if (!String(socialDraft.value || '').trim()) {
    errors.push({
      name: 'socialDraft.value',
      message: 'Please enter a link.',
    });
  } else if (!isValidCardLinkValue(socialDraft.value, socialDraft.label)) {
    errors.push({
      name: 'socialDraft.value',
      message: 'Please enter a valid link.',
    });
  }

  return errors;
}

function saveSocialDraft() {
  const errors = validateSocialDraft();

  if (errors.length > 0) {
    toast.add({
      title: 'Please fix the link details',
      description: buildHelpfulFormErrorMessage(errors),
      color: 'error',
    });
    return;
  }

  const nextLink: SocialFormLink = {
    label: socialDraft.label,
    value: String(socialDraft.value || '').trim(),
    customLabel: String(socialDraft.customLabel || '').trim(),
  };

  if (
    socialEditorMode.value === 'edit' &&
    editingSocialIndex.value !== null &&
    state.socials[editingSocialIndex.value]
  ) {
    state.socials.splice(editingSocialIndex.value, 1, nextLink);
  } else {
    state.socials.push(nextLink);
  }

  closeSocialSlideover();
}

function requestRemoveLink(index: number) {
  pendingDeleteSocialIndex.value = index;
  isDeleteSocialConfirmOpen.value = true;
}

function closeDeleteSocialConfirm() {
  pendingDeleteSocialIndex.value = null;
  isDeleteSocialConfirmOpen.value = false;
}

function confirmRemoveLink() {
  if (pendingDeleteSocialIndex.value === null) return;
  state.socials.splice(pendingDeleteSocialIndex.value, 1);
  closeDeleteSocialConfirm();
}

function updatePreviewSplineVariables() {
  if (!previewSpline.value) return;

  applyCombinedCardToSpline(previewSpline.value, {
    firstName: state.firstName || card.value?.firstName || '',
    lastName: state.lastName || card.value?.lastName || '',
    position: state.position || card.value?.position || '',
    phone: state.phone || card.value?.phone || '',
    phoneCountryCode:
      state.phoneCountryCode || card.value?.phoneCountryCode || '',
    email: state.email || card.value?.email || '',
    website: state.website || card.value?.website,
    planCode: card.value?.subscription?.planCode,
    joinedAt: card.value?.createdAt,
  });
}

function disposePreviewSpline() {
  previewSpline.value?.dispose();
  previewSpline.value = null;
}

function openPreviewModal() {
  if (!card.value?.splineUrl) {
    toast.add({
      title: 'Preview unavailable',
      description: 'This card does not have a Spline scene to preview yet.',
      color: 'warning',
      icon: 'i-lucide-triangle-alert',
    });
    return;
  }

  isPreviewModalOpen.value = true;
}

async function loadPreviewSpline() {
  if (!import.meta.client || !isPreviewModalOpen.value) return;

  const splineUrl = card.value?.splineUrl;
  if (!splineUrl) return;

  await nextTick();

  const canvas = previewCanvasEl.value;
  if (!canvas) return;

  disposePreviewSpline();
  isPreviewLoading.value = true;

  const spline = new Application(canvas);
  previewSpline.value = spline;

  try {
    await spline.load(`${splineUrl}?v=${Date.now()}`);
    updatePreviewSplineVariables();
  } catch {
    toast.add({
      title: 'Unable to load preview',
      description: 'Please try again in a moment.',
      color: 'error',
      icon: 'i-heroicons-x-circle',
    });
  } finally {
    isPreviewLoading.value = false;
  }
}

watch(
  () => socialDraft.label,
  (label) => {
    if (label !== 'Custom') {
      socialDraft.customLabel = '';
    }
  }
);

watch(socialsListEl, (el) => {
  if (!el) return;
  useSortable(socialsListEl, socialsSortable, {
    animation: 200,
    handle: '.drag-handle',
    draggable: '.sortable-link-row',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    fallbackOnBody: true,
    swapThreshold: 0.65,
    invertSwap: true,
  });
});

watch(isSocialSlideoverOpen, (open) => {
  if (!open) {
    editingSocialIndex.value = null;
    resetSocialDraft();
  }
});

watch(isPreviewModalOpen, async (open) => {
  if (open) {
    await loadPreviewSpline();
    return;
  }

  isPreviewLoading.value = false;
  disposePreviewSpline();
});

watch(
  [
    () => state.firstName,
    () => state.lastName,
    () => state.position,
    () => state.phone,
    () => state.phoneCountryCode,
    () => state.email,
    () => state.website,
  ],
  () => {
    updatePreviewSplineVariables();
  }
);

watch(
  () => card.value?.splineUrl,
  async (nextSplineUrl, previousSplineUrl) => {
    if (
      isPreviewModalOpen.value &&
      nextSplineUrl &&
      nextSplineUrl !== previousSplineUrl
    ) {
      await loadPreviewSpline();
    }
  }
);

onBeforeUnmount(() => {
  disposePreviewSpline();
});
</script>

<template>
  <div class="rounded-[8px] bg-surface p-4 sm:p-8">
    <div v-if="isLoading" class="space-y-8">
      <div class="flex items-center gap-4">
        <USkeleton class="h-24 w-24 rounded-full" />
        <USkeleton class="h-10 w-40 sm:w-56" />
      </div>
      <div class="grid grid-cols-2 gap-6">
        <USkeleton v-for="i in 6" :key="i" class="h-12 w-full" />
      </div>
    </div>
    <UForm
      v-else
      :state="state"
      :validate="validate"
      @submit="onSubmit"
      @error="onFormError"
      class="space-y-8"
    >
      <div class="space-y-2">
        <h2
          class="text-md sm:text-xl font-medium uppercase tracking-widest text-ink"
        >
          Contact Information
        </h2>
        <p class="max-w-160 text-sm leading-5.25 text-subtle">
          This information will be visible on your persona card and exchange
          contact profile. Please share only what you are comfortable.
        </p>
      </div>

      <div class="flex items-center gap-6 pt-1">
        <div class="relative">
          <UAvatar
            :src="displayAvatar || undefined"
            icon="i-lucide-user"
            class="size-16 sm:size-20 rounded-full object-cover"
            :ui="{
              icon: 'size-10',
            }"
          />
          <UButton
            v-if="displayAvatar"
            color="error"
            variant="solid"
            size="sm"
            icon="i-lucide-trash-2"
            class="scale-80 sm:scale-100 absolute -bottom-1 sm:bottom-0 -right-1 sm:right-0 rounded-full border-2 border-surface dark:border-gray-900"
            aria-label="Remove photo"
            @click="openRemovePhotoConfirm"
          />
        </div>

        <div class="flex flex-col gap-3">
          <div class="flex items-center gap-2">
            <input
              type="file"
              id="avatar-input"
              class="hidden"
              accept="image/*"
              @change="onFileChange"
            />
            <UButton
              label="Upload Photo"
              icon="i-lucide-upload"
              color="neutral"
              variant="soft"
              class="h-10 text-sm rounded-full bg-raised px-4 text-ink hover:bg-line"
              @click="triggerFilePicker"
            />
            <!-- <span
              v-if="selectedFile"
              class="text-xs text-primary-500 font-medium"
            >
              Ready to upload
            </span> -->
          </div>
          <p class="text-xs text-subtle">
            JPG, PNG or WebP. Prefer under 800KB.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 sm:gap-y-6">
        <UFormField
          label="First Name"
          name="firstName"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
        >
          <UInput
            v-model="state.firstName"
            class="w-full"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
            }"
          />
        </UFormField>
        <UFormField
          label="Last Name"
          name="lastName"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
        >
          <UInput
            v-model="state.lastName"
            class="w-full"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
            }"
          />
        </UFormField>
        <UFormField
          label="Professional Title / Role"
          name="position"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
        >
          <UInput
            v-model="state.position"
            class="w-full"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
            }"
          />
        </UFormField>
        <UFormField
          label="Company / Brand Name"
          name="company"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
        >
          <UInput
            v-model="state.company"
            class="w-full"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
            }"
          />
        </UFormField>
        <UFormField
          label="Phone Number"
          name="phone"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
        >
          <UiPhoneField
            v-model="state.phone"
            v-model:country-code="state.phoneCountryCode"
            name="phone"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
            }"
          />
        </UFormField>
        <UFormField
          label="Email Address"
          name="email"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
        >
          <UInput
            v-model="state.email"
            class="w-full"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
            }"
          />
        </UFormField>
        <UFormField
          label="Personal Website / Portfolio"
          name="website"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
        >
          <UInput
            v-model="state.website"
            class="w-full"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
            }"
          />
        </UFormField>
      </div>

      <div class="space-y-4 pt-3 sm:pt-6">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium text-ink">
            Social / Professional Links
          </h3>
          <UButton
            type="button"
            label="Add Link"
            icon="i-lucide-plus"
            variant="soft"
            size="sm"
            class="rounded-full bg-raised text-xs px-3 text-ink hover:bg-line"
            @click="openCreateLinkSlideover"
          />
        </div>
        <div ref="socialsListEl" class="relative flex flex-col gap-3">
          <div
            v-for="(link, index) in state.socials"
            :key="`${index}-${link.label}-${link.value}`"
            class="sortable-link-row relative flex items-center gap-3 rounded-[6px] border border-line bg-raised p-3"
          >
            <button
              type="button"
              class="drag-handle inline-flex h-10 w-9 cursor-grab items-center justify-center rounded-[4px] text-subtle hover:bg-surface active:cursor-grabbing"
              aria-label="Drag to reorder link"
            >
              <UIcon name="i-lucide-grip-vertical" class="size-5" />
            </button>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-ink">
                {{ resolveSocialLabel(link) || 'Untitled Link' }}
              </p>
              <p class="truncate text-sm text-subtle">
                {{ link.value || 'No URL added yet' }}
              </p>
            </div>
            <div class="flex items-center gap-1">
              <UButton
                type="button"
                size="sm"
                icon="i-lucide-pen-square"
                color="neutral"
                variant="ghost"
                class="text-subtle hover:bg-surface hover:text-ink"
                @click="openEditLinkSlideover(index)"
              />
              <UButton
                type="button"
                size="sm"
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                class="hover:bg-error/10"
                @click="requestRemoveLink(index)"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end pt-2 sm:pt-3">
        <UButton
          type="button"
          color="neutral"
          variant="ghost"
          icon="i-lucide-eye"
          class="mr-3 h-10 text-sm rounded-full px-4 text-subtle hover:bg-raised hover:text-ink"
          @click="openPreviewModal"
        >
          Preview Your Card
        </UButton>
        <UButton
          type="submit"
          class="h-10 text-sm rounded-full bg-raised px-6 text-ink hover:bg-line disabled:bg-ink/20 active:bg-line cursor-pointer"
          icon="i-lucide-square-pen"
          :loading="isSaving"
        >
          Save
        </UButton>
      </div>
    </UForm>
  </div>

  <USlideover
    v-model:open="isSocialSlideoverOpen"
    side="right"
    inset
    :title="
      socialEditorMode === 'create' ? 'ADD SOCIAL LINK' : 'EDIT SOCIAL LINK'
    "
    :ui="{
      content: 'bg-surface overflow-hidden',
      header: 'border-b-2 border-raised px-6 py-6',
      title: 'text-sm font-medium tracking-[1.4px] text-ink uppercase',
      body: 'bg-surface px-6 py-6',
    }"
  >
    <template #body>
      <div class="space-y-6">
        <UFormField
          label="Link Type"
          name="socialDraft.label"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
        >
          <USelectMenu
            v-model="socialDraft.label"
            :items="linkTypeItems"
            :search-input="false"
            class="w-full"
            placeholder="Select Link Type"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink',
            }"
          />
        </UFormField>

        <UFormField
          v-if="socialDraft.label === 'Custom'"
          label="Custom Label"
          name="socialDraft.customLabel"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
        >
          <UInput
            v-model="socialDraft.customLabel"
            placeholder="Custom Label"
            class="w-full"
            :ui="{
              base: 'h-12 border-line bg-raised text-sm text-ink placeholder:text-ink/50',
            }"
          />
        </UFormField>

        <UFormField
          label="Link"
          name="socialDraft.value"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
        >
          <UInput
            v-model="socialDraft.value"
            placeholder="www.example.com"
            class="w-full"
            :ui="{
              base: 'h-12 border-line bg-raised text-sm text-ink placeholder:text-ink/50',
            }"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <UButton
        type="button"
        label="Cancel"
        color="neutral"
        variant="ghost"
        class="h-10 cursor-pointer rounded-full px-5 text-sm font-medium text-subtle hover:bg-raised hover:text-ink"
        @click="closeSocialSlideover"
      />
      <UButton
        type="button"
        :label="socialEditorMode === 'create' ? 'Add Link' : 'Save Link'"
        leading-icon="i-lucide-check"
        color="neutral"
        class="h-10 cursor-pointer rounded-full bg-ink pr-6 pl-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
        @click="saveSocialDraft"
      />
    </template>
  </USlideover>

  <UModal
    v-model:open="isDeleteSocialConfirmOpen"
    title="Delete Link?"
    :ui="{
      content: 'bg-surface max-w-md',
      title: 'text-ink',
      body: 'pt-4',
      footer: 'justify-end gap-2',
    }"
  >
    <template #body>
      <p class="text-sm leading-relaxed text-soft">
        This action cannot be undone. The selected social link will be removed.
      </p>
    </template>
    <template #footer>
      <UButton
        type="button"
        label="Cancel"
        color="neutral"
        variant="ghost"
        class="h-10 text-sm rounded-full px-5"
        @click="closeDeleteSocialConfirm"
      />
      <UButton
        type="button"
        label="Delete"
        color="error"
        class="h-10 text-sm rounded-full px-6 font-medium"
        @click="confirmRemoveLink"
      />
    </template>
  </UModal>

  <UiConfirmDeleteModal
    v-model:open="isRemovePhotoConfirmOpen"
    title="Remove Photo?"
    confirm-label="Remove"
    @confirm="confirmRemovePhoto"
  >
    Your profile photo will be removed from this card when you&nbsp;save.
  </UiConfirmDeleteModal>

  <UModal
    v-model:open="isPreviewModalOpen"
    title="Card Preview"
    :ui="{
      content: 'max-w-xl bg-surface overflow-hidden',
      header: 'border-b border-raised px-4 py-4 sm:px-6',
      title: 'text-ink',
      body: 'p-4 sm:p-6',
    }"
  >
    <template #body>
      <div class="space-y-4">
        <div
          class="relative h-[70vh] min-h-105 overflow-hidden rounded-lg border border-ink/10 bg-[#0b0b0b]"
        >
          <canvas ref="previewCanvasEl" class="h-full w-full"></canvas>

          <div
            v-if="isPreviewLoading"
            class="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <div class="flex items-center gap-3 text-sm text-white">
              <UIcon
                name="i-lucide-loader-circle"
                class="size-5 animate-spin"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
:deep(.sortable-ghost) {
  opacity: 0.35;
}

:deep(.sortable-chosen) {
  background: transparent;
}

:deep(.sortable-drag) {
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
}
</style>
