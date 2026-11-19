<script setup lang="ts">
import type { FormError } from '#ui/types';
import type { CardSocialLink } from '~~/shared/contracts/card';
import {
  CARD_LINK_SELECT_ITEMS,
  createEmptyCardLink,
  defaultNewLinkLabel,
  toCardLinkMenuItems,
} from '~~/shared/constants/card-link-options';
import {
  CUSTOM_SOCIAL_LABEL,
  createLinkTypeItemsWithCustom,
  normalizeSocialLinksForForm,
  resolveSocialLinksForSubmission,
  type SocialFormLink,
} from '~~/shared/utils/social-links';

const MAX_LINKS = 30;

const props = defineProps<{
  slug: string;
  socials: CardSocialLink[];
}>();

const open = defineModel<boolean>('open', { required: true });
const emit = defineEmits<{ saved: [] }>();

const toast = useToast();
const { normalizeLinkValuesWithHttps, isValidCardLinkValue } =
  useUrlNormalization();
const { mutateAsync: updateCard } = useUpdateCardMutation(() => props.slug);

const linkTypeItems = computed(() =>
  toCardLinkMenuItems(createLinkTypeItemsWithCustom(CARD_LINK_SELECT_ITEMS))
);

const isSaving = ref(false);
const socialDraft = reactive<SocialFormLink>({
  ...createEmptyCardLink(),
  customLabel: '',
});

const slideoverUi = {
  header: 'border-b-2 border-raised px-6 py-6',
  title: 'text-sm font-medium tracking-[1.4px] text-ink uppercase',
  body: 'px-6 py-6',
  content: 'bg-surface',
};

function resetSocialDraft() {
  socialDraft.label = defaultNewLinkLabel(
    linkTypeItems.value.flat().map((item) => item.label),
    props.socials.map((link) => link.label)
  );
  socialDraft.value = '';
  socialDraft.customLabel = '';
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

async function saveSocialDraft() {
  const errors = validateSocialDraft();
  if (errors.length > 0) {
    toast.add({
      title: 'Please check this link',
      description: errors[0]?.message || 'Please check the link details.',
      color: 'error',
    });
    return;
  }

  const current = normalizeSocialLinksForForm(props.socials);
  if (current.length >= MAX_LINKS) {
    toast.add({
      title: 'You can add up to 30 links',
      color: 'info',
    });
    return;
  }

  const nextLink: SocialFormLink = {
    label: socialDraft.label,
    value: String(socialDraft.value || '').trim(),
    customLabel: String(socialDraft.customLabel || '').trim(),
  };
  const socials = normalizeLinkValuesWithHttps(
    resolveSocialLinksForSubmission([...current, nextLink])
  ).filter((item) => item.label && item.value);

  isSaving.value = true;
  try {
    await updateCard({ socials });
    open.value = false;
    emit('saved');
    toast.add({ title: 'Link added', color: 'success' });
  } catch (error) {
    toast.add({
      title: 'Could not update links',
      description: apiErrorMessage(error),
      color: 'error',
    });
  } finally {
    isSaving.value = false;
  }
}

watch(
  () => socialDraft.label,
  (label) => {
    if (label !== CUSTOM_SOCIAL_LABEL) socialDraft.customLabel = '';
  }
);

watch(open, (isOpen) => {
  if (isOpen) resetSocialDraft();
});
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    inset
    title="Add Link"
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
          <CardLinkTypeSelect
            v-model="socialDraft.label"
            :items="linkTypeItems"
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
            :ui="{
              base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
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
            class="w-full"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
            }"
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
        @click="open = false"
      />
      <UButton
        type="submit"
        form="card-link-editor-form"
        label="Add Link"
        leading-icon="i-lucide-check"
        color="neutral"
        :loading="isSaving"
        class="h-10 cursor-pointer rounded-full bg-ink pr-6 pl-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
      />
    </template>
  </USlideover>
</template>
