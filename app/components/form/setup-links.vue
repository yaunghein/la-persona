<script setup lang="ts">
import { useQuery, useMutation } from '@tanstack/vue-query';
import type { FormError, FormErrorEvent, FormSubmitEvent } from '#ui/types';
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

const emit = defineEmits<{
  back: [];
  completed: [];
}>();

const route = useRoute();
const toast = useToast();
const slug = computed(() => route.params.slug as string);
const { normalizeLinkValuesWithHttps, isValidPublicWebUrl } =
  useUrlNormalization();
const linkTypeItems = computed<string[][]>(() =>
  createLinkTypeItemsWithCustom(CARD_LINK_SELECT_ITEMS)
);

const { data: card } = useQuery<SelectCard>({
  queryKey: ['cards', slug],
  queryFn: () => $fetch(`/api/cards/${slug.value}`),
});

// 1. Initialize with one empty link placeholder
const state = reactive({
  id: undefined as string | number | undefined,
  socials: [] as SocialFormLink[],
});
const socialsListEl = ref<HTMLElement | null>(null);
const isSocialSlideoverOpen = ref(false);
const socialEditorMode = ref<'create' | 'edit'>('create');
const editingSocialIndex = ref<number | null>(null);
const pendingDeleteSocialIndex = ref<number | null>(null);
const isDeleteSocialConfirmOpen = ref(false);
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

watch(
  card,
  (val) => {
    if (!val) return;
    state.id = val.id;

    // 2. If card has socials, use them; otherwise, keep the list empty
    if (val.socials && val.socials.length > 0) {
      state.socials = normalizeSocialLinksForForm(val.socials);
    } else {
      state.socials = [];
    }
  },
  { immediate: true }
);

const { mutate: submitRequest, isPending: isSubmitting } = useMutation({
  mutationFn: async (formData: typeof state) => {
    const socials = normalizeLinkValuesWithHttps(
      resolveSocialLinksForSubmission(state.socials)
    ).filter((item) => item.label || item.value);

    return await $fetch(`/api/cards`, {
      method: 'PATCH',
      body: {
        ...formData,
        socials,
        id: state.id,
      },
    });
  },
  onSuccess: () => {
    toast.add({
      title: 'Update Requested',
      description: 'Your profile changes are now pending review.',
      color: 'success',
    });
    emit('completed');
  },
  onError: (err: any) => {
    toast.add({
      title: 'Submission Failed',
      description: err.data?.statusMessage || 'Action failed',
      color: 'error',
    });
  },
});

function onSubmit() {
  const hasAtLeastOneLink = state.socials.some(
    (item) => String(item.value || '').trim().length > 0
  );
  if (!hasAtLeastOneLink) {
    toast.add({
      title: 'Input Required',
      description: 'Please add at least one link.',
      color: 'warning',
    });
    return;
  }

  submitRequest(state);
}

function validate(formData: typeof state): FormError[] {
  const errors: FormError[] = [];

  getCustomSocialLabelMissingIndexes(formData.socials).forEach((index) => {
    errors.push({
      name: `socials.${index}.customLabel`,
      message: 'Custom label is required.',
    });
  });

  formData.socials.forEach((social, index) => {
    const value = String(social.value || '').trim();
    if (!value) return;

    if (!isValidPublicWebUrl(value)) {
      errors.push({
        name: `socials.${index}.value`,
        message: 'Please enter a valid URL.',
      });
    }
  });

  return errors;
}

function onFormError(event: FormErrorEvent) {
  if (!event.errors.length) return;

  toast.add({
    title: 'Please check your links',
    description: 'Fix the highlighted fields and try again.',
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
    { label: socialDraft.label, value: socialDraft.value },
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
      title: 'Validation Error',
      description: errors[0]?.message || 'Please check the link details.',
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
</script>

<template>
  <div class="bg-elevated/25 rounded-md p-4 sm:p-8">
    <h1
      class="text-md sm:text-xl font-medium uppercase tracking-widest text-white"
    >
      Finish setting up
    </h1>
    <p class="mt-2 sm:mt-4 mb-8 text-sm text-muted">
      Create your La Persona business card in two steps.
    </p>

    <UForm
      :state="state"
      :validate="validate"
      @submit="onSubmit"
      @error="onFormError"
      class="space-y-6"
    >
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <p class="text-sm font-medium text-gray-200">
            Social / Professional Links <span class="text-red-500">*</span>
          </p>
          <UButton
            type="button"
            icon="i-heroicons-plus-circle"
            label="Add Link"
            size="sm"
            class="rounded-full bg-[#232323] text-xs px-3 text-white hover:bg-[#2a2a2a]"
            @click="openCreateLinkSlideover"
          />
        </div>

        <div ref="socialsListEl" class="relative flex flex-col gap-3">
          <div
            v-for="(link, index) in state.socials"
            :key="`${index}-${link.label}-${link.value}`"
            class="sortable-link-row relative flex items-center gap-3 rounded-[6px] border border-white/10 bg-white/5 p-3"
          >
            <button
              type="button"
              class="drag-handle inline-flex h-10 w-9 cursor-grab items-center justify-center rounded-[4px] text-muted hover:bg-white/5 active:cursor-grabbing"
              aria-label="Drag to reorder link"
            >
              <UIcon name="i-lucide-grip-vertical" class="size-5" />
            </button>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-white">
                {{ resolveSocialLabel(link) || 'Untitled Link' }}
              </p>
              <p class="mt-1 truncate text-sm text-muted">
                {{ link.value || 'No URL added yet' }}
              </p>
            </div>
            <div class="flex items-center gap-1">
              <UButton
                type="button"
                size="sm"
                icon="i-lucide-pen-square"
                variant="ghost"
                class="text-muted hover:bg-white/5 hover:text-white"
                @click="openEditLinkSlideover(index)"
              />
              <UButton
                type="button"
                size="sm"
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                class="text-muted hover:bg-white/5"
                @click="requestRemoveLink(index)"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end pt-2 gap-4">
        <UButton
          type="button"
          class="h-10 rounded-full px-5 font-semibold"
          variant="ghost"
          @click="emit('back')"
        >
          Back
        </UButton>
        <UButton
          type="submit"
          class="h-10 rounded-full px-5 font-semibold"
          color="primary"
          icon="material-symbols:fitbit-check-small"
          :loading="isSubmitting"
        >
          Complete Setup
        </UButton>
      </div>
    </UForm>
  </div>

  <USlideover
    v-model:open="isSocialSlideoverOpen"
    side="right"
    inset
    :title="socialEditorMode === 'create' ? 'Add Link' : 'Edit Link'"
    :ui="{
      header: 'border-b border-white/10 px-6 py-6',
      title: 'text-sm font-medium tracking-[1.4px] text-white uppercase',
      body: 'px-6 py-6',
      content: 'bg-[#171717] border border-[#2a2a2a]',
    }"
  >
    <template #body>
      <div class="space-y-6">
        <UFormField
          label="Link Type"
          name="socialDraft.label"
          class="[&_label]:mb-2 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
        >
          <USelectMenu
            v-model="socialDraft.label"
            :items="linkTypeItems"
            :search-input="false"
            class="w-full"
            variant="soft"
            placeholder="Select Link Type"
            size="xl"
            :ui="{
              content: 'bg-[#171717] border border-[#2a2a2a]',
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
            variant="soft"
            size="xl"
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
            variant="soft"
            size="xl"
          />
        </UFormField>

        <div class="flex justify-end pt-2 gap-4">
          <UButton
            type="button"
            label="Cancel"
            variant="ghost"
            class="h-10 rounded-full px-5 font-semibold"
            @click="closeSocialSlideover"
          />
          <UButton
            type="button"
            :label="socialEditorMode === 'create' ? 'Add Link' : 'Save Link'"
            class="h-10 rounded-full px-5 font-semibold"
            color="primary"
            icon="i-lucide-check"
            @click="saveSocialDraft"
          />
        </div>
      </div>
    </template>
  </USlideover>

  <UModal
    v-model:open="isDeleteSocialConfirmOpen"
    title="Delete Link"
    :ui="{
      content: 'max-w-md',
      footer: 'justify-end gap-2',
    }"
  >
    <template #body>
      <p class="text-sm text-muted">
        This action cannot be undone. The selected social link will be removed.
      </p>
    </template>
    <template #footer>
      <UButton
        type="button"
        label="Cancel"
        variant="ghost"
        class="rounded-full px-5"
        @click="closeDeleteSocialConfirm"
      />
      <UButton
        type="button"
        label="Delete"
        color="error"
        class="rounded-full px-6 font-medium"
        @click="confirmRemoveLink"
      />
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
