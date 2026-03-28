<script setup lang="ts">
import { useQuery, useMutation } from '@tanstack/vue-query';
import type { FormError, FormErrorEvent, FormSubmitEvent } from '#ui/types';
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
  socials: [{ ...createEmptyCardLink(), customLabel: '' }] as SocialFormLink[],
});

watch(
  card,
  (val) => {
    if (!val) return;
    state.id = val.id;

    // 2. If card has socials, use them; otherwise, keep the default one
    if (val.socials && val.socials.length > 0) {
      state.socials = normalizeSocialLinksForForm(val.socials);
    } else {
      state.socials = [{ ...createEmptyCardLink(), customLabel: '' }];
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

const addLink = () => {
  state.socials.push({ ...createEmptyCardLink(), customLabel: '' });
};

const removeLink = (index: number) => {
  // 1. Ensure state.socials exists before checking length
  if (state.socials && state.socials.length > 1) {
    state.socials.splice(index, 1);
  } else if (state.socials?.[0]) {
    // 2. If it's the last one, clear it instead of deleting
    state.socials[0].value = '';
    state.socials[0].customLabel = '';
    toast.add({
      title: 'Notice',
      description: 'At least one link is required.',
      color: 'neutral',
    });
  }
};
</script>

<template>
  <div class="bg-elevated/25 rounded-md p-8">
    <h1 class="text-xl font-semibold tracking-[2px] uppercase leading-none">
      Finish setting up
    </h1>
    <p class="mt-4 mb-8 text-sm text-muted">
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
            icon="i-heroicons-plus-circle"
            size="sm"
            variant="soft"
            label="Add Link"
            @click="addLink"
          />
        </div>

        <div
          v-for="(link, index) in state.socials"
          :key="index"
          class="flex flex-col md:flex-row gap-3 items-start md:items-center"
        >
          <USelectMenu
            v-model="link.label"
            variant="soft"
            :items="linkTypeItems"
            :search-input="false"
            class="w-full md:w-40"
            size="xl"
          />
          <UFormField
            v-if="link.label === 'Custom'"
            :name="`socials.${index}.customLabel`"
            class="w-full md:w-52"
          >
            <UInput
              v-model="link.customLabel"
              placeholder="Custom Label"
              class="w-full"
              size="xl"
              variant="soft"
            />
          </UFormField>
          <UFormField :name="`socials.${index}.value`" class="flex-1 w-full">
            <UInput
              v-model="link.value"
              placeholder="www.example.com"
              class="w-full"
              size="xl"
              variant="soft"
            />
          </UFormField>
          <UButton
            icon="i-lucide-x"
            variant="ghost"
            :disabled="state.socials.length === 1 && !link.value"
            class="max-h-11.75"
            @click="removeLink(index)"
          />
        </div>
      </div>

      <div class="flex justify-end pt-6 gap-4 border-t border-white/10">
        <UButton
          type="button"
          class="rounded-full px-6 font-semibold"
          variant="ghost"
          @click="emit('back')"
        >
          Back
        </UButton>
        <UButton
          type="submit"
          class="rounded-full px-6 font-semibold"
          color="primary"
          icon="material-symbols:fitbit-check-small"
          :loading="isSubmitting"
        >
          Complete Setup
        </UButton>
      </div>
    </UForm>
  </div>
</template>
