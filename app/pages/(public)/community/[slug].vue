<script setup lang="ts">
import type { PublicCommunity } from '~~/shared/contracts/organization';

const route = useRoute();
const slug = computed(() => String(route.params.slug || ''));

const { data: community, error } = await useFetch<PublicCommunity>(
  () => `/api/public/communities/${slug.value}`
);

if (!community.value) {
  throw createError({
    statusCode: error.value?.statusCode || 404,
    statusMessage: 'Page not found',
  });
}

usePageSeo({
  title: () => community.value?.name || 'Community',
  description: () =>
    truncateSeoText(
      community.value?.description || `${community.value?.name} on LA PERSONA.`
    ),
  image: () => communityCoverSrc(community.value?.coverImageUrl ?? ''),
  imageAlt: () => community.value?.name,
});
</script>

<template>
  <div class="min-h-dvh bg-canvas px-6 py-6 sm:px-8 sm:py-10">
    <div class="mx-auto flex w-full max-w-120 flex-col gap-8 sm:max-w-md">
      <OrganizationAbout v-if="community" :data="community" variant="page" />
      <UiPoweredByLaPersona />
    </div>
  </div>
</template>
