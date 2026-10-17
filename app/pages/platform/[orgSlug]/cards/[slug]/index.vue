<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui';
import type { CardPaymentKind } from '~~/shared/contracts/billing';
import {
  cardHolderName,
  isCommunityCard,
} from '~/features/card/utils/card-badge';

definePageMeta({
  layout: 'platform',
});

useSeoMeta({ ...getSeoTitle('Edit Card - LA PERSONA') });

const route = useRoute();
const router = useRouter();
const orgSlug = computed(() => String(route.params.orgSlug || ''));
const slug = computed(() => String(route.params.slug || ''));

const {
  data: card,
  isPending: isCardPending,
  error: cardError,
} = useCardQuery(slug);
const showCardUnavailable = computed(
  () => !isCardPending.value && (!!cardError.value || !card.value)
);
const isCommunity = computed(() => !!card.value && isCommunityCard(card.value));

const { data: subscription } = useCardSubscriptionQuery(slug, {
  enabled: () => !!card.value && !isCommunity.value,
});

const isPendingApproval = computed(() => {
  const status = card.value?.subscription?.status;
  return status === 'pending_approval' || status === 'submitted';
});
const isTrial = computed(
  () =>
    !!card.value?.subscription?.isTrial ||
    card.value?.subscription?.status === 'trial'
);

const badgeLabel = computed(() => {
  if (!card.value) return '';
  if (isCommunity.value) return card.value.organization.name || 'Community';
  if (isPendingApproval.value) return 'Pending';
  const planCode = card.value.subscription?.planCode;
  if (!planCode || isTrial.value) return 'Standard (Trial)';
  if (planCode === 'founder-club') return "Founders' Club";
  if (planCode === 'premium') return 'Premium';
  return 'Standard';
});

const showUpgradeButton = computed(() => {
  const planCode = card.value?.subscription?.planCode;
  if (isCommunity.value) return false;
  if (planCode === 'premium' || planCode === 'founder-club') return false;
  return isTrial.value || planCode === 'standard';
});
const upgradeButtonLabel = computed(() =>
  isTrial.value ? 'Upgrade to Premium' : 'Update to Premium'
);

const paymentKind = ref<CardPaymentKind | null>(null);
const isPaymentOpen = computed({
  get: () => paymentKind.value !== null,
  set: (open) => {
    if (!open) paymentKind.value = null;
  },
});

function openRenewal() {
  paymentKind.value = 'renewal';
}

function openPremiumUpgrade() {
  paymentKind.value = 'premium_upgrade';
}

const isPendingInfoOpen = ref(false);

function openPendingInfo() {
  if (isPendingApproval.value) isPendingInfoOpen.value = true;
}

const tabs: TabsItem[] = [
  { label: 'Contact Info', value: 'contact' },
  { label: 'QR & Wallpaper', value: 'wallpaper' },
];

const activeTab = computed({
  get: () => (route.query.tab as string) || 'contact',
  set: (tab) => router.push({ path: route.path, query: { tab } }),
});
</script>

<template>
  <div
    v-if="isCardPending"
    class="flex min-h-[calc(100vh-7rem)] items-center justify-center"
  >
    <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-white/70" />
  </div>

  <div
    v-else-if="showCardUnavailable"
    class="flex min-h-[calc(100vh-7rem)] flex-col items-center justify-center gap-4"
  >
    <UIcon
      name="i-material-symbols:cards-stack-outline-sharp"
      class="size-8 text-muted"
    />
    <h2 class="text-base font-medium uppercase tracking-widest text-white">
      Card not found
    </h2>
    <p class="max-w-[20rem] text-center text-sm text-muted">
      This card does not exist or you do not have permission to access it.
    </p>
    <UButton
      label="Back to Cards"
      icon="i-lucide-arrow-left"
      color="neutral"
      class="mt-2 h-10 rounded-full bg-white px-5 font-medium text-dark hover:bg-white/90"
      :to="`/platform/${orgSlug}/cards`"
    />
  </div>

  <template v-else>
    <BillingSubscriptionBanner
      v-if="subscription && !isCommunity"
      :overview="subscription"
      @renew="openRenewal"
    />

    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:mt-0"
    >
      <div>
        <div
          class="flex flex-wrap items-center gap-y-2 -translate-x-2 sm:translate-x-0"
        >
          <UButton
            icon="i-lucide-chevron-left"
            color="primary"
            class="h-10 bg-transparent mr-1 sm:mr-2 text-white hover:bg-white/10 active:hover:bg-white/20"
            :to="`/platform/${orgSlug}/cards`"
          />
          <h1
            class="text-lg sm:text-2xl font-medium tracking-widest uppercase leading-tight"
          >
            {{ card?.firstName }} {{ card?.lastName }}
          </h1>
          <UBadge
            class="ml-3 font-semibold"
            :class="[
              isPendingApproval
                ? 'cursor-pointer bg-amber-500/20 text-amber-300'
                : 'bg-[#232323] text-white',
              isCommunity ? 'normal-case' : 'uppercase',
            ]"
            size="sm"
            @click="openPendingInfo"
          >
            {{ badgeLabel }}
          </UBadge>
        </div>
        <p class="text-sm leading-5 text-muted ml-0 sm:ml-10">
          Manage your contact information, QR, and wallpaper.
        </p>
      </div>

      <UButton
        v-if="showUpgradeButton"
        :label="upgradeButtonLabel"
        icon="i-lucide-chevrons-up"
        color="neutral"
        class="self-start h-10 rounded-full bg-white px-5 font-medium text-dark hover:bg-white/90"
        @click="openPremiumUpgrade"
      />
    </div>

    <UTabs
      v-model="activeTab"
      :items="tabs"
      :ui="{
        root: 'items-start mt-2 sm:mt-6',
        list: 'bg-[#171717] w-full max-w-[32rem] rounded-[8px] p-1 overflow-x-auto',
        indicator: 'bg-[#232323]',
        trigger: 'data-[state=active]:text-white rounded-[4px] px-4 py-2.5',
        content: 'mt-5',
      }"
    >
      <template #content="{ item }">
        <!-- <CardDesignInfoForm v-if="item.value === '3d'" /> -->
        <CardInfoForm v-if="item.value === 'contact'" />
        <CardWallpaperDownload v-if="item.value === 'wallpaper'" />
      </template>
    </UTabs>

    <BillingCardPaymentSlideover
      v-if="card"
      v-model:open="isPaymentOpen"
      :card-slug="card.slug"
      :organization-slug="card.organization.slug"
      :kind="paymentKind"
    />

    <CardPendingApprovalInfo
      v-model:open="isPendingInfoOpen"
      :card-name="card ? cardHolderName(card) : 'This card'"
    />
  </template>
</template>
