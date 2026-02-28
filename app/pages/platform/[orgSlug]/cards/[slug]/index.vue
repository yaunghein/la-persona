<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

import type { TabsItem } from '@nuxt/ui';

useSeoMeta({ ...getSeoTitle('Edit Card - LA PERSONA') });

const route = useRoute();
const router = useRouter();
const orgSlug = computed(() => String(route.params.orgSlug || ''));

const items: TabsItem[] = [
  { label: '3D Card Information', value: '3d' },
  { label: 'Contact Information', value: 'contact' },
  { label: 'QR & Wallpapers', value: 'wallpaper' },
];

const active = computed({
  get() {
    return (route.query.tab as string) || '3d';
  },
  set(tab) {
    router.push({
      path: route.path,
      query: { tab },
    });
  },
});
</script>

<template>
  <div class="flex items-start justify-between gap-4">
    <div>
      <div class="flex">
        <UButton
          icon="i-lucide-chevron-left"
          size="md"
          color="primary"
          class="bg-transparent mr-2 text-white -mt-[0.15rem] hover:bg-white/10 active:hover:bg-white/20"
          :to="`/platform/${orgSlug}/cards`"
        />
        <h1
          class="text-[1.75rem] font-medium tracking-[0.17rem] uppercase leading-none"
        >
          Personal Card
        </h1>
        <div
          class="uppercase text-[0.625rem] leading-none font-bold p-2.5 rounded bg-[#232323] ml-3"
        >
          Founders' Club Edition
        </div>
      </div>
      <p class="mt-2 text-sm leading-[20px] text-muted ml-10">
        Manage your 3D card information, contact information, QR, and
        wallpapers.
      </p>
    </div>

    <UButton
      label="Upgrade to Premium"
      icon="i-lucide-chevrons-up"
      color="neutral"
      class="rounded-full bg-white px-4 font-medium text-dark hover:bg-white/90"
    />
  </div>

  <UTabs
    v-model="active"
    :items="items"
    :ui="{
      root: 'items-start mt-6',
      list: 'bg-[#171717] max-w-[32rem] rounded-[8px] p-1',
      indicator: 'bg-[#232323]',
      trigger: 'data-[state=active]:text-white rounded-[4px] px-4 py-2.5',
      content: 'mt-5',
    }"
  >
    <template #content="{ item }">
      <FormRequestCardInfoChange v-if="item.value === '3d'" />
      <FormUpdateCardInfo v-if="item.value === 'contact'" />
      <FormDownloadWallpaper v-if="item.value === 'wallpaper'" />
    </template>
  </UTabs>
</template>
