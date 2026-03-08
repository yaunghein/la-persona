<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';

const router = useRouter();
const route = useRoute();
const activeOrg = authClient.useActiveOrganization();
watch(activeOrg, (newOrg) => {
  if (newOrg.data?.slug) {
    console.log('newOrg', newOrg.data);
    // router.push(`/platform/${newOrg.data.slug}`);
  }
});

const redirectTo = computed(() => {
  const value = route.query.redirectTo;
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/')) return null;
  return value;
});

const { data: cards, isError } = useQuery({
  queryKey: ['cards', () => activeOrg.value.data?.slug],
  queryFn: async () => {
    return await $fetch('/api/cards', {
      query: { organizationSlug: activeOrg.value.data?.slug },
    });
  },
  enabled: () => !!activeOrg.value.data?.slug,
});

watch(
  [cards, activeOrg],
  ([newCards, org]) => {
    if (!newCards || !org) return;
    console.log('newCards', newCards.length);

    if (newCards.length === 1) {
      const card = newCards[0];
      console.log('card', card);

      if (card && card.socials && card.socials?.length === 0) {
        router.push(`/platform/${org.data?.slug}/cards/${card.slug}/setup`);
      } else {
        router.push(redirectTo.value || `/platform/${org.data?.slug}`);
      }
    } else {
      router.push(redirectTo.value || `/platform/${org.data?.slug}`);
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="flex items-center justify-center h-dvh">
    <div class="flex flex-col items-center gap-3">
      <UIcon
        name="i-lucide-loader-2"
        class="w-8 h-8 animate-spin text-primary"
      />
      <p v-if="isError" class="text-red-500 text-sm">
        Failed to load cards. Please refresh.
      </p>
      <p v-else class="text-gray-500 text-sm animate-pulse">
        Syncing your workspace...
      </p>
    </div>
  </div>
</template>
