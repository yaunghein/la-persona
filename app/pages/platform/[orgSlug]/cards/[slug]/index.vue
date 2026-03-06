<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

import type { TabsItem } from '@nuxt/ui';
import { useQuery } from '@tanstack/vue-query';

useSeoMeta({ ...getSeoTitle('Edit Card - LA PERSONA') });

const route = useRoute();
const router = useRouter();
const orgSlug = computed(() => String(route.params.orgSlug || ''));
const slug = computed(() => String(route.params.slug || ''));
const { data: card } = useQuery<CardDTO>({
  queryKey: ['cards', slug],
  queryFn: () => $fetch(`/api/cards/${slug.value}`),
  enabled: () => !!slug.value,
});

type CardSubscriptionSummary = {
  daysLeft: number | null;
  subscription?: {
    effectiveStatus?: string;
  } | null;
} | null;

const cardId = computed(() => card.value?.id || '');
const { data: cardSubscriptionSummary } = useQuery<CardSubscriptionSummary>({
  queryKey: ['card-subscription', cardId],
  queryFn: async () => {
    if (!cardId.value) return null;

    try {
      return await $fetch<CardSubscriptionSummary>(
        `/api/subscriptions/cards/${cardId.value}`
      );
    } catch {
      return null;
    }
  },
  enabled: () => !!cardId.value,
});

const bannerDaysLeft = computed(
  () => cardSubscriptionSummary.value?.daysLeft ?? null
);
const bannerDaysLabel = computed(() => {
  if (bannerDaysLeft.value === 1) return 'DAY';
  return 'DAYS';
});
const bannerEffectiveStatus = computed(
  () => cardSubscriptionSummary.value?.subscription?.effectiveStatus ?? null
);
const isTrialEndingSoon = computed(() => {
  if (bannerEffectiveStatus.value !== 'trial') return false;
  if (bannerDaysLeft.value === null) return false;
  return bannerDaysLeft.value <= 15 && bannerDaysLeft.value >= 0;
});
const isSubscriptionEndingSoon = computed(() => {
  const status = bannerEffectiveStatus.value;
  const paidSubscriptionStatuses = new Set([
    'active',
    'grace',
    'pending_approval',
    'submitted',
  ]);

  if (!status || !paidSubscriptionStatuses.has(status)) return false;
  if (bannerDaysLeft.value === null) return false;
  return bannerDaysLeft.value <= 15 && bannerDaysLeft.value >= 0;
});
const showEndingBanner = computed(
  () => isTrialEndingSoon.value || isSubscriptionEndingSoon.value
);

const showUpgradeButton = computed(() => {
  const planCode = card.value?.subscription?.planCode;
  const isTrial = card.value?.subscription?.isTrial;
  const status = card.value?.subscription?.status;

  if (planCode === 'premium' || planCode === 'founder_club') return false;
  if (isTrial || status === 'trial') return true;
  return planCode === 'standard';
});

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
  <div
    v-if="showEndingBanner"
    class="mb-8 flex min-h-14 items-center justify-center bg-[#232323] px-8 -mx-6 -mt-6"
  >
    <p
      class="text-center text-sm font-medium uppercase tracking-widest text-white"
    >
      <template v-if="isTrialEndingSoon">
        Your trial period is going to end in
        <span class="font-bold">{{ bannerDaysLeft }}</span>
        {{ bannerDaysLabel }}. Click <span class="underline">here</span> to
        extend.
      </template>
      <template v-else>
        Your subscription is going to end in
        <span class="font-bold">{{ bannerDaysLeft }}</span>
        {{ bannerDaysLabel }}. Click <span class="underline">here</span> to
        renew.
      </template>
    </p>
  </div>

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
      v-if="showUpgradeButton"
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
