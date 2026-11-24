<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

const toast = useToast();
const { organizationSlug } = useOrganizationSlug();
const { data, isLoading, isError, error, refetch } =
  useCommunityQuery(organizationSlug);

function retry() {
  refetch();
}

const { mutate: leaveCommunity, isPending: isLeaving } =
  useLeaveCommunityMutation();
const isQuitOpen = ref(false);

function confirmQuit() {
  const name = data.value?.name ?? 'the community';
  leaveCommunity(organizationSlug.value, {
    onSuccess: async () => {
      isQuitOpen.value = false;
      toast.add({ title: `You left ${name}`, color: 'success' });
      await navigateTo(ROUTES.PLATFORM.ROOT);
    },
    onError: (error) =>
      toast.add({
        title: 'Could not leave',
        description: apiErrorMessage(error),
        color: 'error',
      }),
  });
}
</script>

<template>
  <div v-if="isLoading" class="flex flex-col gap-8">
    <USkeleton class="h-8 w-64 rounded-md" />
    <USkeleton class="aspect-[1/0.25] w-full rounded-t-lg" />
    <USkeleton class="min-h-96 w-full rounded-b-lg" />
  </div>
  <div v-else-if="isError" class="flex flex-col items-start gap-4">
    <p class="text-sm text-subtle">
      {{ apiErrorMessage(error, 'Could not load community about.') }}
    </p>
    <UButton
      label="Try again"
      color="neutral"
      class="h-10 rounded-full bg-ink px-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
      @click="retry"
    />
  </div>
  <OrganizationAbout v-else-if="data" :data="data" @quit="isQuitOpen = true" />
  <UiConfirmDeleteModal
    v-model:open="isQuitOpen"
    :title="`Leave ${data?.name ?? 'community'}?`"
    confirm-label="Leave"
    :pending="isLeaving"
    @confirm="confirmQuit"
  >
    Your community card's link stops working and you leave its events. The
    contacts you collected on it stay in your&nbsp;Contacts.
  </UiConfirmDeleteModal>
</template>
