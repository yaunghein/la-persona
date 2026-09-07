<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

import { useQuery } from '@tanstack/vue-query';
import type { CommunityAboutDTO } from '~~/shared/types/community-about';

const toast = useToast();
const { organizationSlug, withOrganizationQuery } = useOrganizationSlug();

const { data, isLoading, isError, error, refetch } = useQuery({
  queryKey: ['community-about', organizationSlug],
  queryFn: () =>
    $fetch<CommunityAboutDTO>('/api/community-about', {
      query: withOrganizationQuery(),
    }),
});

function onQuit() {
  toast.add({
    title: 'Quit community',
    description: 'Leaving a community is not wired yet.',
    color: 'warning',
  });
}

function onViewOrganizer() {
  toast.add({
    title: 'View organizer',
    description: 'Organizer profiles are not wired yet.',
    color: 'neutral',
  });
}
</script>

<template>
  <div v-if="isLoading" class="flex min-h-[calc(100dvh-11rem)] flex-col gap-8">
    <USkeleton class="h-8 w-64 rounded-md" />
    <USkeleton class="aspect-[1/0.25] w-full rounded-t-lg" />
    <USkeleton class="min-h-96 w-full rounded-b-lg" />
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
        'Could not load community about.'
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
  <CommunityAbout
    v-else-if="data"
    :data="data"
    @quit="onQuit"
    @view-organizer="onViewOrganizer"
  />
</template>
