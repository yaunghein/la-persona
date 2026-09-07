<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type {
  CommunitySettingsDTO,
  CommunitySettingsFormValues,
} from '~~/shared/types/community-settings';
import {
  userOrganizationsQueryKey,
  type UserOrganization,
} from '~~/app/composables/user-organizations';

const toast = useToast();
const queryClient = useQueryClient();
const { organizationSlug, withOrganizationQuery } = useOrganizationSlug();

const emptyForm = (): CommunitySettingsFormValues => ({
  name: '',
  description: '',
  guidelines: '',
  whyJoin: '',
  coverImageUrl: '',
  logoUrl: '',
});

const form = ref<CommunitySettingsFormValues>(emptyForm());

const { data, isLoading, isError, error, refetch } = useQuery({
  queryKey: ['community-settings', organizationSlug],
  queryFn: () =>
    $fetch<CommunitySettingsDTO>('/api/community-settings', {
      query: withOrganizationQuery(),
    }),
});

watch(
  data,
  (value) => {
    if (!value) return;
    form.value = { ...value };
  },
  { immediate: true }
);

const { mutate: saveSettings, isPending: isSaving } = useMutation({
  mutationFn: (values: CommunitySettingsFormValues) =>
    $fetch<CommunitySettingsDTO>('/api/community-settings', {
      method: 'PATCH',
      query: withOrganizationQuery(),
      body: {
        name: values.name,
        description: values.description,
        guidelines: values.guidelines,
        whyJoin: values.whyJoin,
      },
    }),
  onSuccess: async (saved) => {
    form.value = { ...saved };
    queryClient.setQueryData(
      userOrganizationsQueryKey,
      (orgs: UserOrganization[] | undefined) =>
        (orgs ?? []).map((org) =>
          org.slug === organizationSlug.value
            ? { ...org, name: saved.name }
            : org
        )
    );
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['community-settings', organizationSlug.value],
      }),
      queryClient.invalidateQueries({ queryKey: userOrganizationsQueryKey }),
    ]);
    toast.add({
      title: 'Settings updated',
      description: 'Community settings were saved.',
      color: 'success',
    });
  },
  onError: (error: { data?: { statusMessage?: string }; message?: string }) => {
    toast.add({
      title: 'Could not save',
      description:
        error.data?.statusMessage ||
        error.message ||
        'Community settings could not be saved.',
      color: 'error',
    });
  },
});

function onSubmit() {
  if (!form.value.name.trim()) {
    toast.add({
      title: 'Name required',
      description: 'Organization name cannot be empty.',
      color: 'warning',
    });
    return;
  }

  saveSettings(form.value);
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
  <div v-if="isLoading" class="flex min-h-[calc(100dvh-11rem)] flex-col gap-8">
    <USkeleton class="h-8 w-64 rounded-md" />
    <USkeleton class="min-h-96 w-full rounded-lg" />
  </div>
  <div
    v-else-if="isError"
    class="flex min-h-[calc(100dvh-11rem)] flex-col items-start gap-4"
  >
    <p class="text-sm text-[#8b8b8b]">
      {{
        (error as { data?: { statusMessage?: string }; message?: string })?.data
          ?.statusMessage ||
        (error as { message?: string })?.message ||
        'Could not load community settings.'
      }}
    </p>
    <UButton
      label="Try again"
      color="neutral"
      class="h-9 rounded-full bg-white px-5 text-sm font-medium text-dark hover:bg-white/90"
      @click="
        () => {
          refetch();
        }
      "
    />
  </div>
  <CommunitySettingsForm
    v-else
    v-model="form"
    :saving="isSaving"
    @submit="onSubmit"
    @delete="onDelete"
  />
</template>
