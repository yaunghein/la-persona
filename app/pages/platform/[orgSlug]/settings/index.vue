<script setup lang="ts">
import { UpdateCommunitySettingsRequest } from '~~/shared/contracts/organization';
import type { CommunitySettingsFormValues } from '~~/shared/contracts/organization';

definePageMeta({
  layout: 'platform',
});

const toast = useToast();
const { organizationSlug } = useOrganizationSlug();

const emptyForm = (): CommunitySettingsFormValues => ({
  name: '',
  description: '',
  guidelines: '',
  whyJoin: '',
  coverImageUrl: '',
  logoUrl: '',
  splineUrl: '',
  wallpaperUrl: '',
  cardBackUrl: '',
});

const {
  state: form,
  hydrate,
  clear: clearDraft,
} = useFormDraft<CommunitySettingsFormValues>(
  () => `org:${organizationSlug.value}:settings`,
  emptyForm
);

function updateForm(value: CommunitySettingsFormValues) {
  Object.assign(form, value);
}

const { data, isLoading, isError, error, refetch } =
  useCommunityQuery(organizationSlug);

watch(
  data,
  (value) => {
    if (!value) return;
    hydrate({ ...value });
  },
  { immediate: true }
);

const { mutate: updateSettings, isPending: isSaving } =
  useUpdateCommunitySettingsMutation(organizationSlug);

/** Unchanged images are left out, so a legacy stored value never blocks a save. */
function saveSettings(values: CommunitySettingsFormValues) {
  const loaded = data.value;
  updateSettings(
    UpdateCommunitySettingsRequest.parse({
      name: values.name,
      description: values.description,
      guidelines: values.guidelines,
      whyJoin: values.whyJoin,
      ...(values.logoUrl !== loaded?.logoUrl && { logoUrl: values.logoUrl }),
      ...(values.coverImageUrl !== loaded?.coverImageUrl && {
        coverImageUrl: values.coverImageUrl,
      }),
    }),
    {
      onSuccess: (saved) => {
        clearDraft();
        hydrate({ ...saved });
        toast.add({
          title: 'Settings updated',
          description: 'Community settings were saved.',
          color: 'success',
        });
      },
      onError: (error) => {
        toast.add({
          title: 'Could not save',
          description: apiErrorMessage(
            error,
            'Community settings could not be saved.'
          ),
          color: 'error',
        });
      },
    }
  );
}

function onSubmit() {
  if (!form.name.trim()) {
    toast.add({
      title: 'Name required',
      description: 'Organization name cannot be empty.',
      color: 'warning',
    });
    return;
  }

  saveSettings({ ...form });
}

function retry() {
  refetch();
}

function onDelete() {
  toast.add({
    title: 'Delete community',
    description: 'Deletion is not wired yet.',
    color: 'warning',
  });
}
</script>

<template>
  <div v-if="isLoading" class="flex flex-col gap-8">
    <USkeleton class="h-8 w-64 rounded-md" />
    <USkeleton class="min-h-96 w-full rounded-lg" />
  </div>
  <div v-else-if="isError" class="flex flex-col items-start gap-4">
    <p class="text-sm text-subtle">
      {{ apiErrorMessage(error, 'Could not load community settings.') }}
    </p>
    <UButton
      label="Try again"
      color="neutral"
      class="h-10 rounded-full bg-ink px-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
      @click="retry"
    />
  </div>
  <OrganizationSettingsForm
    v-else
    :model-value="form"
    @update:model-value="updateForm"
    :saving="isSaving"
    @submit="onSubmit"
    @delete="onDelete"
  />
</template>
