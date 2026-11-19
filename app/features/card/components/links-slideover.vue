<script setup lang="ts">
import type { FormError } from '#ui/types';
import type { CardSocialLink } from '~~/shared/contracts/card';
import { useSortable } from '@vueuse/integrations/useSortable';
import {
  CARD_LINK_SELECT_ITEMS,
  createEmptyCardLink,
} from '~~/shared/constants/card-link-options';
import {
  CUSTOM_SOCIAL_LABEL,
  createLinkTypeItemsWithCustom,
  normalizeSocialLinksForForm,
  resolveSocialLinksForSubmission,
  type SocialFormLink,
  type SocialSubmitLink,
} from '~~/shared/utils/social-links';

const MAX_LINKS = 30;

const props = defineProps<{
  slug: string;
  socials: CardSocialLink[];
  /** Open the add-link form as soon as this slideover opens. */
  startCreating?: boolean;
}>();

const open = defineModel<boolean>('open', { required: true });
const emit = defineEmits<{ saved: [] }>();

const toast = useToast();
const { normalizeLinkValuesWithHttps, isValidCardLinkValue } =
  useUrlNormalization();
const { mutateAsync: updateCard } = useUpdateCardMutation(() => props.slug);

const linkTypeItems = computed(() =>
  createLinkTypeItemsWithCustom(CARD_LINK_SELECT_ITEMS)
);

const links = ref<SocialFormLink[]>([]);
const savedKey = ref('');
const lastSaved = ref<CardSocialLink[]>([]);
const isSaving = ref(false);
const socialsListEl = ref<HTMLElement | null>(null);
const isEditorOpen = ref(false);
const editorMode = ref<'create' | 'edit'>('create');
const editingIndex = ref<number | null>(null);
const pendingDeleteIndex = ref<number | null>(null);
const isDeleteOpen = ref(false);
const socialDraft = reactive<SocialFormLink>({
  ...createEmptyCardLink(),
  customLabel: '',
});

const socialsSortable = computed({
  get: () => links.value,
  set: (value) => {
    links.value = value;
  },
});

const slideoverUi = {
  header: 'border-b-2 border-raised px-6 py-6',
  title: 'text-sm font-medium tracking-[1.4px] text-ink uppercase',
  body: 'px-6 py-6',
  content: 'bg-surface',
};

function linkKey(items: SocialSubmitLink[]) {
  return JSON.stringify(items.map((item) => [item.label, item.value]));
}

function toSocials(items: SocialFormLink[]) {
  return normalizeLinkValuesWithHttps(
    resolveSocialLinksForSubmission(items)
  ).filter((item) => item.label && item.value);
}

function hydrate(socials: CardSocialLink[]) {
  links.value = normalizeSocialLinksForForm(socials);
  savedKey.value = linkKey(toSocials(links.value));
  lastSaved.value = socials;
}

function resolveSocialLabel(link: SocialFormLink) {
  return link.label === CUSTOM_SOCIAL_LABEL
    ? link.customLabel || CUSTOM_SOCIAL_LABEL
    : link.label;
}

function resetSocialDraft() {
  socialDraft.label = createEmptyCardLink().label;
  socialDraft.value = '';
  socialDraft.customLabel = '';
}

function openCreateLink() {
  if (links.value.length >= MAX_LINKS) {
    toast.add({
      title: 'You can add up to 30 links',
      color: 'info',
    });
    return;
  }
  editorMode.value = 'create';
  editingIndex.value = null;
  resetSocialDraft();
  isEditorOpen.value = true;
}

function openEditLink(index: number) {
  const link = links.value[index];
  if (!link || isSaving.value) return;
  editorMode.value = 'edit';
  editingIndex.value = index;
  socialDraft.label = link.label || createEmptyCardLink().label;
  socialDraft.value = link.value || '';
  socialDraft.customLabel = link.customLabel || '';
  isEditorOpen.value = true;
}

function closeEditor() {
  isEditorOpen.value = false;
  editingIndex.value = null;
  resetSocialDraft();
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
    socialDraft.label === CUSTOM_SOCIAL_LABEL &&
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

let queued: { links: SocialFormLink[]; message?: string } | null = null;

async function persist(next: SocialFormLink[], message?: string) {
  const socials = toSocials(next);
  if (!message && linkKey(socials) === savedKey.value) return;

  if (isSaving.value) {
    queued = { links: next.map((link) => ({ ...link })), message };
    return;
  }

  isSaving.value = true;
  try {
    const updated = await updateCard({ socials });
    hydrate(updated.socials);
    emit('saved');
    if (message) {
      toast.add({ title: message, color: 'success' });
    }
  } catch (error) {
    toast.add({
      title: 'Could not update links',
      description: apiErrorMessage(error),
      color: 'error',
    });
    hydrate(lastSaved.value);
  } finally {
    isSaving.value = false;
    const nextSave = queued;
    queued = null;
    if (nextSave) persist(nextSave.links, nextSave.message);
  }
}

function saveSocialDraft() {
  const errors = validateSocialDraft();
  if (errors.length > 0) {
    toast.add({
      title: 'Please check this link',
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
  const next = [...links.value];
  const isEdit =
    editorMode.value === 'edit' &&
    editingIndex.value !== null &&
    next[editingIndex.value];

  if (isEdit && editingIndex.value !== null) {
    next.splice(editingIndex.value, 1, nextLink);
  } else {
    next.push(nextLink);
  }

  closeEditor();
  persist(next, isEdit ? 'Link updated' : 'Link added');
}

function requestRemoveLink(index: number) {
  if (isSaving.value) return;
  pendingDeleteIndex.value = index;
  isDeleteOpen.value = true;
}

function closeDeleteConfirm() {
  pendingDeleteIndex.value = null;
  isDeleteOpen.value = false;
}

function confirmRemoveLink() {
  if (pendingDeleteIndex.value === null) return;
  const next = links.value.filter(
    (_, index) => index !== pendingDeleteIndex.value
  );
  closeDeleteConfirm();
  persist(next, 'Link removed');
}

watch(
  () => socialDraft.label,
  (label) => {
    if (label !== CUSTOM_SOCIAL_LABEL) socialDraft.customLabel = '';
  }
);

watch(isEditorOpen, (isOpen) => {
  if (!isOpen) {
    editingIndex.value = null;
    resetSocialDraft();
  }
});

watch(open, (isOpen) => {
  if (!isOpen) {
    closeEditor();
    closeDeleteConfirm();
    return;
  }
  hydrate(props.socials);
  if (props.startCreating) openCreateLink();
});

let stopSorting: (() => void) | undefined;

watch(socialsListEl, (el) => {
  stopSorting?.();
  stopSorting = undefined;
  if (!el) return;
  const sorting = useSortable(el, socialsSortable, {
    animation: 200,
    handle: '.drag-handle',
    draggable: '.sortable-link-row',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    fallbackOnBody: true,
    swapThreshold: 0.65,
    invertSwap: true,
    onEnd: () => {
      nextTick(() => persist(links.value));
    },
  });
  sorting.start();
  stopSorting = sorting.stop;
});
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    inset
    title="Links"
    :ui="slideoverUi"
  >
    <template #body>
      <p v-if="!links.length" class="py-12 text-center text-sm text-subtle">
        No links yet. Add the first one&nbsp;below.
      </p>

      <div ref="socialsListEl" class="relative flex flex-col gap-3">
        <div
          v-for="(link, index) in links"
          :key="`${index}-${link.label}-${link.value}`"
          class="sortable-link-row relative flex items-center gap-3 rounded-[6px] border border-ink/10 bg-ink/5 p-3"
        >
          <UTooltip text="Drag to reorder">
            <button
              type="button"
              class="drag-handle inline-flex h-10 w-9 cursor-grab items-center justify-center rounded-[4px] text-muted hover:bg-ink/5 active:cursor-grabbing"
              aria-label="Drag to reorder link"
            >
              <UIcon name="i-lucide-grip-vertical" class="size-5" />
            </button>
          </UTooltip>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-ink">
              {{ resolveSocialLabel(link) || 'Untitled link' }}
            </p>
            <p class="mt-1 truncate text-sm text-muted">
              {{ link.value || 'No URL added yet' }}
            </p>
          </div>
          <div class="flex items-center gap-1">
            <UTooltip :text="`Edit ${resolveSocialLabel(link) || 'link'}`">
              <UButton
                type="button"
                size="sm"
                icon="i-lucide-pen-square"
                variant="ghost"
                class="text-muted hover:bg-ink/5 hover:text-ink"
                :aria-label="`Edit ${resolveSocialLabel(link) || 'link'}`"
                :disabled="isSaving"
                @click="openEditLink(index)"
              />
            </UTooltip>
            <UTooltip :text="`Remove ${resolveSocialLabel(link) || 'link'}`">
              <UButton
                type="button"
                size="sm"
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                class="hover:bg-error/10"
                :aria-label="`Remove ${resolveSocialLabel(link) || 'link'}`"
                :disabled="isSaving"
                @click="requestRemoveLink(index)"
              />
            </UTooltip>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton
        type="button"
        :label="links.length ? 'Add Link' : 'Add Links'"
        leading-icon="i-lucide-plus"
        color="neutral"
        :disabled="isSaving || links.length >= MAX_LINKS"
        class="h-10 cursor-pointer rounded-full bg-ink pr-6 pl-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
        @click="openCreateLink"
      />
    </template>
  </USlideover>

  <USlideover
    v-model:open="isEditorOpen"
    side="right"
    inset
    :title="editorMode === 'create' ? 'Add Link' : 'Edit Link'"
    :ui="slideoverUi"
  >
    <template #body>
      <form
        id="card-link-editor-form"
        class="space-y-6"
        @submit.prevent="saveSocialDraft"
      >
        <UFormField
          label="Link Type"
          name="socialDraft.label"
          class="[&_label]:mb-2 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
        >
          <USelectMenu
            v-model="socialDraft.label"
            :items="linkTypeItems"
            :search-input="false"
            class="w-full"
            variant="soft"
            placeholder="Select Link Type"
            size="xl"
            :ui="{ content: 'bg-surface border border-line' }"
          />
        </UFormField>

        <UFormField
          v-if="socialDraft.label === CUSTOM_SOCIAL_LABEL"
          label="Custom Label"
          name="socialDraft.customLabel"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
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
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
        >
          <UInput
            v-model="socialDraft.value"
            class="w-full"
            variant="soft"
            size="xl"
          />
        </UFormField>
      </form>
    </template>

    <template #footer>
      <UButton
        type="button"
        label="Cancel"
        color="neutral"
        variant="ghost"
        class="h-10 cursor-pointer rounded-full px-5 text-sm font-medium text-subtle hover:bg-raised hover:text-ink"
        @click="closeEditor"
      />
      <UButton
        type="submit"
        form="card-link-editor-form"
        :label="editorMode === 'create' ? 'Add Link' : 'Save Link'"
        leading-icon="i-lucide-check"
        color="neutral"
        :loading="isSaving"
        class="h-10 cursor-pointer rounded-full bg-ink pr-6 pl-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
      />
    </template>
  </USlideover>

  <UModal
    v-model:open="isDeleteOpen"
    title="Delete Link"
    :ui="{ content: 'max-w-md', footer: 'justify-end gap-2' }"
  >
    <template #body>
      <p class="text-sm text-muted">
        This link will be removed from your card.
      </p>
    </template>
    <template #footer>
      <UButton
        type="button"
        label="Cancel"
        variant="ghost"
        class="h-10 rounded-full px-5 text-sm"
        @click="closeDeleteConfirm"
      />
      <UButton
        type="button"
        label="Delete"
        color="error"
        class="h-10 rounded-full px-6 text-sm font-medium"
        :loading="isSaving"
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
