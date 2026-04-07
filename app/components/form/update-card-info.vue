<script setup lang="ts">
import { Application } from '@splinetool/runtime';
import imageCompression from 'browser-image-compression';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import type { FormError } from '@nuxt/ui';
import type { FormSubmitEvent } from '#ui/types';
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
import { slugify } from '~~/shared/utils/slugify';

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const slug = computed(() => String(route.params.slug || ''));
const runtimeConfig = useRuntimeConfig();
const toast = useToast();
const {
  normalizeUrlWithHttps,
  normalizeLinkValuesWithHttps,
  isValidPublicWebUrl,
} = useUrlNormalization();

const selectedFile = ref<File | null>(null);
const localPreviewUrl = ref<string | null>(null);

const { data: card, isLoading } = useQuery<SelectCard>({
  queryKey: ['cards', slug],
  queryFn: () => $fetch(`/api/cards/${slug.value}`),
});

const state = reactive({
  id: '',
  slug: '',
  firstName: '',
  lastName: '',
  position: '',
  company: '',
  phone: '',
  email: '',
  website: '',
  avatarUrl: '',
  socials: [] as SocialFormLink[],
});
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
const updateCardFormSchema = cardUpdateSchema.omit({ socials: true });
const linkTypeItems = computed<string[][]>(() =>
  createLinkTypeItemsWithCustom(CARD_LINK_SELECT_ITEMS)
);
const previewCardSlug = computed(() => state.slug || slug.value);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeSlugInput(value: string | null | undefined) {
  return slugify(String(value || '').replace(/_/g, '-'));
}

function normalizeSlugField() {
  state.slug = normalizeSlugInput(state.slug);
}

const FIELD_LABELS: Record<string, string> = {
  slug: 'Card URL slug',
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

type ValidationIssue = {
  path?: Array<string | number>;
  message?: string;
};

function buildHelpfulApiErrorMessage(error: any) {
  const issues = error?.data?.data as ValidationIssue[] | undefined;
  if (Array.isArray(issues) && issues.length > 0) {
    const messages = issues
      .map((issue) => {
        const fieldName = Array.isArray(issue.path)
          ? issue.path.join('.')
          : undefined;
        const label = getErrorFieldLabel(fieldName);
        return issue.message ? `${label}: ${issue.message}` : '';
      })
      .filter(Boolean);

    if (messages.length > 0) {
      return [...new Set(messages)].join(' ');
    }
  }

  const statusMessage = error?.data?.statusMessage || error?.statusMessage;
  if (
    typeof statusMessage === 'string' &&
    statusMessage &&
    !['Error', 'Bad Request', 'Internal Server Error'].includes(statusMessage)
  ) {
    return statusMessage;
  }

  if (typeof error?.data?.message === 'string' && error.data.message) {
    return error.data.message;
  }

  return 'We could not update your card. Please try again.';
}

watch(
  card,
  (val) => {
    if (!val) return;
    state.id = val.id ?? '';
    state.slug = val.slug ?? '';
    state.firstName = val.firstName ?? '';
    state.lastName = val.lastName ?? '';
    state.position = val.position ?? '';
    state.company = val.company ?? '';
    state.phone = val.phone ?? '';
    state.email = val.email ?? '';
    state.website = val.website ?? '';
    state.avatarUrl = val.avatarUrl ?? '';
    const incomingSocials = JSON.parse(JSON.stringify(val.socials || [])) as
      | SocialFormLink[]
      | [];
    state.socials = normalizeSocialLinksForForm(incomingSocials);
  },
  { immediate: true }
);

const displayAvatar = computed(() => {
  if (localPreviewUrl.value) return localPreviewUrl.value;
  if (!state.avatarUrl) return null;
  if (state.avatarUrl.startsWith('http')) return state.avatarUrl;

  const bucket = runtimeConfig.public.awsBucketName;
  const region = runtimeConfig.public.awsRegion;
  return `https://${bucket}.s3.${region}.amazonaws.com/${state.avatarUrl}`;
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

function triggerFilePicker() {
  const input = document.getElementById(
    'avatar-input'
  ) as HTMLInputElement | null;
  input?.click();
}

const { mutate: updateCard, isPending: isSaving } = useMutation({
  mutationFn: async (formData: UpdateCard) => {
    let finalAvatarUrl = state.avatarUrl;

    if (selectedFile.value) {
      const compressed = await imageCompression(selectedFile.value, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1200,
      });

      const { uploadUrl, fileKey } = await $fetch('/api/s3/presigned', {
        method: 'POST',
        body: {
          fileType: compressed.type,
          fileName: selectedFile.value.name,
        },
      });

      await fetch(uploadUrl, {
        method: 'PUT',
        body: compressed,
        headers: { 'Content-Type': compressed.type },
      });

      finalAvatarUrl = fileKey;
    }

    const normalizedSocials = normalizeLinkValuesWithHttps(
      resolveSocialLinksForSubmission(state.socials)
    );
    const normalizedSlug = normalizeSlugInput(formData.slug);

    return await $fetch('/api/cards', {
      method: 'PATCH',
      body: {
        ...formData,
        slug: normalizedSlug,
        website: normalizeUrlWithHttps(formData.website),
        avatarUrl: finalAvatarUrl,
        id: card.value?.id,
        socials: normalizedSocials,
      },
    });
  },
  onSuccess: async (updatedCard) => {
    clearSelection();
    if (!updatedCard) {
      toast.add({
        title: 'Card updated',
        description: 'Your card details were updated successfully.',
        color: 'success',
      });
      return;
    }

    state.slug = updatedCard.slug ?? state.slug;
    await queryClient.invalidateQueries({ queryKey: ['cards'] });

    if (updatedCard.slug && updatedCard.slug !== slug.value) {
      await router.replace(
        `/platform/${route.params.orgSlug}/cards/${updatedCard.slug}`
      );
    }

    toast.add({
      title: 'Success',
      description: 'Your card details were updated successfully.',
      color: 'success',
    });
  },
  onError: (err: any) => {
    toast.add({
      title: 'Unable to update card',
      description: buildHelpfulApiErrorMessage(err),
      color: 'error',
    });
  },
});

function onSubmit(event: FormSubmitEvent<UpdateCard>) {
  updateCard(event.data);
}

function validate(formData: Partial<UpdateCard>): FormError[] {
  const errors: FormError[] = [];
  const slugValue = String(formData.slug || '').trim();
  const normalizedSlug = normalizeSlugInput(slugValue);

  if (!normalizedSlug) {
    errors.push({
      name: 'slug',
      message: 'Please enter a card URL slug.',
    });
  } else if (!SLUG_PATTERN.test(normalizedSlug)) {
    errors.push({
      name: 'slug',
      message:
        'Use lowercase letters, numbers, and hyphens only, like john-smith.',
    });
  }

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
  const normalizedValue = normalizeLinkValuesWithHttps([
    {
      label: socialDraft.label,
      value: socialDraft.value,
    },
  ])[0]?.value;

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
  } else if (!isValidPublicWebUrl(normalizedValue || '')) {
    errors.push({
      name: 'socialDraft.value',
      message: 'Please enter a valid URL.',
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

function websiteLabelForSpline(website: string | null | undefined): string {
  if (!website?.trim()) return '';
  const raw = website.trim();
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    const host = url.hostname.toUpperCase();
    const path =
      url.pathname && url.pathname !== '/'
        ? url.pathname.replace(/\/$/, '').toUpperCase()
        : '';
    return path ? `${host}${path}` : host;
  } catch {
    return raw
      .replace(/^https?:\/\//i, '')
      .replace(/\/$/, '')
      .toUpperCase();
  }
}

function updatePreviewSplineVariables() {
  if (!previewSpline.value) return;

  const firstName = state.firstName || card.value?.firstName || '';
  const lastName = state.lastName || card.value?.lastName || '';
  const fullname = [firstName, lastName]
    .filter(Boolean)
    .join(' ')
    .trim()
    .toUpperCase();

  previewSpline.value.setVariables({
    name: fullname,
    position:
      (state.position || card.value?.position || '').toUpperCase() || '',
    phone: state.phone || card.value?.phone || '',
    email: (state.email || card.value?.email || '').toUpperCase() || '',
    website: websiteLabelForSpline(state.website || card.value?.website),
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
  <div class="rounded-[8px] bg-[#171717] p-4 sm:p-8 mb-17 sm:mb-0">
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
      :schema="updateCardFormSchema"
      :validate="validate"
      @submit="onSubmit"
      @error="onFormError"
      class="space-y-8"
    >
      <div class="space-y-4">
        <h2
          class="text-md sm:text-xl font-medium uppercase tracking-widest text-white"
        >
          Contact Information
        </h2>
        <p class="max-w-160 text-sm leading-[21px] text-[#8b8b8b]">
          This information will be visible on your public profile page and
          exchange contact feature. Please share only what you are comfortable.
        </p>
      </div>

      <div class="flex items-center gap-6 pt-1">
        <div class="relative">
          <UAvatar
            :src="displayAvatar || undefined"
            icon="i-lucide-user"
            class="size-16 sm:size-20 rounded-full object-cover"
          />
          <UButton
            v-if="displayAvatar"
            color="error"
            variant="solid"
            size="sm"
            icon="i-lucide-trash-2"
            class="scale-80 sm:scale-100 absolute -bottom-1 sm:bottom-0 -right-1 sm:right-0 rounded-full border-2 border-white dark:border-gray-900"
            @click="selectedFile ? clearSelection() : removeCurrentPhoto()"
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
              class="rounded-full bg-[#232323] px-4 text-white hover:bg-[#2a2a2a]"
              @click="triggerFilePicker"
            />
            <!-- <span
              v-if="selectedFile"
              class="text-xs text-primary-500 font-medium"
            >
              Ready to upload
            </span> -->
          </div>
          <p class="text-xs text-[#8b8b8b]">JPG, PNG or WebP. Max 800KB.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 sm:gap-y-6">
        <UFormField
          label="First Name"
          name="firstName"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
        >
          <UInput
            v-model="state.firstName"
            class="w-full"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
            }"
          />
        </UFormField>
        <UFormField
          label="Last Name"
          name="lastName"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
        >
          <UInput
            v-model="state.lastName"
            class="w-full"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
            }"
          />
        </UFormField>
        <UFormField
          label="URL Slug"
          name="slug"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
        >
          <UInput
            v-model="state.slug"
            placeholder="john-smith"
            autocomplete="off"
            class="w-full"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
            }"
            @blur="normalizeSlugField"
          />
          <p class="mt-2 text-xs text-[#8b8b8b]">
            Your public link will be `/c/{{ previewCardSlug || 'your-slug' }}`.
          </p>
        </UFormField>
        <UFormField
          label="Professional Title / Role"
          name="position"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
        >
          <UInput
            v-model="state.position"
            class="w-full"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
            }"
          />
        </UFormField>
        <UFormField
          label="Company / Brand Name"
          name="company"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
        >
          <UInput
            v-model="state.company"
            class="w-full"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
            }"
          />
        </UFormField>
        <UFormField
          label="Phone Number"
          name="phone"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
        >
          <UInput
            v-model="state.phone"
            class="w-full"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
            }"
          />
        </UFormField>
        <UFormField
          label="Email Address"
          name="email"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
        >
          <UInput
            v-model="state.email"
            class="w-full"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
            }"
          />
        </UFormField>
        <UFormField
          label="Personal Website / Portfolio"
          name="website"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
        >
          <UInput
            v-model="state.website"
            class="w-full"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
            }"
          />
        </UFormField>
      </div>

      <div class="space-y-4 pt-3 sm:pt-6">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium text-white">
            Social / Professional Links
          </h3>
          <UButton
            type="button"
            label="Add Link"
            icon="i-lucide-plus"
            variant="soft"
            size="sm"
            class="rounded-full bg-[#232323] text-xs px-3 text-white hover:bg-[#2a2a2a]"
            @click="openCreateLinkSlideover"
          />
        </div>
        <div ref="socialsListEl" class="relative flex flex-col gap-3">
          <div
            v-for="(link, index) in state.socials"
            :key="`${index}-${link.label}-${link.value}`"
            class="sortable-link-row relative flex items-center gap-3 rounded-[6px] border border-[#2a2a2a] bg-[#232323] p-3"
          >
            <button
              type="button"
              class="drag-handle inline-flex h-10 w-9 cursor-grab items-center justify-center rounded-[4px] text-[#8b8b8b] hover:bg-[#171717] active:cursor-grabbing"
              aria-label="Drag to reorder link"
            >
              <UIcon name="i-lucide-grip-vertical" class="size-5" />
            </button>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-white">
                {{ resolveSocialLabel(link) || 'Untitled Link' }}
              </p>
              <p class="truncate text-sm text-[#8b8b8b]">
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
                class="text-[#8b8b8b] hover:bg-[#171717] hover:text-white"
                @click="openEditLinkSlideover(index)"
              />
              <UButton
                type="button"
                size="sm"
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                class="text-[#8b8b8b] hover:bg-[#171717]"
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
          class="mr-3 h-10 rounded-full px-4 text-[#8b8b8b] hover:bg-[#232323] hover:text-white"
          @click="openPreviewModal"
        >
          Preview Your Card
        </UButton>
        <UButton
          type="submit"
          class="h-10 rounded-full bg-[#232323] px-6 text-white hover:bg-[#2a2a2a] disabled:bg-white/20 active:bg-[#2a2a2a] cursor-pointer"
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
      content: 'bg-[#171717] overflow-hidden',
      header: 'border-b-2 border-[#232323] px-6 py-6',
      title: 'text-sm font-medium tracking-[1.4px] text-white uppercase',
      body: 'bg-[#171717] px-6 py-6',
    }"
  >
    <template #body>
      <div class="space-y-6">
        <UFormField
          label="Link Type"
          name="socialDraft.label"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
        >
          <USelectMenu
            v-model="socialDraft.label"
            :items="linkTypeItems"
            :search-input="false"
            class="w-full"
            placeholder="Select Link Type"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white',
            }"
          />
        </UFormField>

        <UFormField
          v-if="socialDraft.label === 'Custom'"
          label="Custom Label"
          name="socialDraft.customLabel"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
        >
          <UInput
            v-model="socialDraft.customLabel"
            placeholder="Custom Label"
            class="w-full"
            :ui="{
              base: 'h-12 border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
            }"
          />
        </UFormField>

        <UFormField
          label="Link"
          name="socialDraft.value"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
        >
          <UInput
            v-model="socialDraft.value"
            placeholder="www.example.com"
            class="w-full"
            :ui="{
              base: 'h-12 border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
            }"
          />
        </UFormField>

        <div class="flex justify-end gap-3 pt-2">
          <UButton
            type="button"
            size="xl"
            label="Cancel"
            color="neutral"
            variant="ghost"
            class="rounded-full px-4 text-[#8b8b8b] hover:bg-[#232323] hover:text-white"
            @click="closeSocialSlideover"
          />
          <UButton
            type="button"
            :label="socialEditorMode === 'create' ? 'Add Link' : 'Save Link'"
            icon="i-lucide-check"
            class="h-10 rounded-full bg-[#232323] px-5 text-white hover:bg-[#2a2a2a]"
            @click="saveSocialDraft"
          />
        </div>
      </div>
    </template>
  </USlideover>

  <UModal
    v-model:open="isDeleteSocialConfirmOpen"
    title="Delete Link?"
    :ui="{
      content: 'bg-[#171717] max-w-md',
      title: 'text-white',
      body: 'pt-4',
      footer: 'justify-end gap-2',
    }"
  >
    <template #body>
      <p class="text-sm leading-relaxed text-[#bcbcbc]">
        This action cannot be undone. The selected social link will be removed.
      </p>
    </template>
    <template #footer>
      <UButton
        type="button"
        size="xl"
        label="Cancel"
        color="neutral"
        variant="ghost"
        class="rounded-full px-5"
        @click="closeDeleteSocialConfirm"
      />
      <UButton
        type="button"
        size="xl"
        label="Delete"
        color="error"
        class="rounded-full px-6 font-medium"
        @click="confirmRemoveLink"
      />
    </template>
  </UModal>

  <UModal
    v-model:open="isPreviewModalOpen"
    title="Card Preview"
    :ui="{
      content: 'max-w-md bg-[#171717] overflow-hidden',
      header: 'border-b border-[#232323] px-4 py-4 sm:px-6',
      title: 'text-white',
      body: 'p-4 sm:p-6',
    }"
  >
    <template #body>
      <div class="space-y-4">
        <div
          class="relative h-[50vh] min-h-[420px] overflow-hidden rounded-lg border border-white/10 bg-[#0b0b0b]"
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
