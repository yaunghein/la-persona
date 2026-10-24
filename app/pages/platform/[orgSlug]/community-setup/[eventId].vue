<script setup lang="ts">
import { ROUTES } from '~~/shared/utils/routes';

definePageMeta({
  layout: false,
});

const route = useRoute();
const { mutateAsync: joinEventCommunity } = useJoinEventCommunityMutation();
const toast = useToast();
const orgSlug = computed(() => String(route.params.orgSlug || ''));
const eventId = computed(() => String(route.params.eventId || ''));

const { data: session } = await authClient.useSession(useFetch);

onMounted(async () => {
  if (!session.value) {
    await navigateTo({
      path: ROUTES.SIGN_IN,
      query: { redirectTo: route.fullPath },
    });
    return;
  }

  if (!eventId.value) {
    toast.add({
      title: 'Open this from an event',
      description: 'Community setup has to start from a public event page.',
      color: 'warning',
    });
    return;
  }

  try {
    const result = await joinEventCommunity(eventId.value);

    if (result.alreadyMember && result.cardComplete) {
      await navigateTo(ROUTES.EVENTS.PUBLIC(result.eventId), { replace: true });
      return;
    }

    if (!result.cardSlug) {
      throw new Error('Community card was not created');
    }

    await navigateTo(
      ROUTES.COMMUNITY_SETUP.CARD(result.organizationSlug, result.cardSlug, {
        step: 'create-card',
        eventId: result.eventId,
      }),
      { replace: true }
    );
  } catch (error: any) {
    toast.add({
      title: 'Could not continue',
      description: apiErrorMessage(
        error,
        'Please try again from the event page.'
      ),
      color: 'error',
    });
    await navigateTo(ROUTES.EVENTS.PUBLIC(eventId.value), { replace: true });
  }
});
</script>

<template>
  <div class="flex h-dvh items-center justify-center bg-surface">
    <div class="flex flex-col items-center gap-3">
      <UIcon
        name="i-lucide-loader-circle"
        class="size-8 animate-spin text-ink"
      />
      <p class="text-sm text-subtle">Setting up your community card...</p>
    </div>
  </div>
</template>
