<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

import type { TabsItem } from '@nuxt/ui';
import imageCompression from 'browser-image-compression';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type {
  SelectSubscriptionPayment,
  SelectSubscriptionPaymentItem,
} from '~~/shared/types/subscription';

useSeoMeta({ ...getSeoTitle('Edit Card - LA PERSONA') });

const route = useRoute();
const router = useRouter();
const toast = useToast();
const queryClient = useQueryClient();
const isPendingInfoOpen = ref(false);
const selectedPendingCardName = ref('');
const orgSlug = computed(() => String(route.params.orgSlug || ''));
const slug = computed(() => String(route.params.slug || ''));
const {
  data: card,
  isPending: isCardPending,
  error: cardError,
} = useQuery<CardDTO>({
  queryKey: ['cards', slug],
  queryFn: () => $fetch<CardDTO>(`/api/cards/${slug.value}`),
  enabled: () => !!slug.value,
});
const showCardUnavailable = computed(
  () => !isCardPending.value && (!!cardError.value || !card.value)
);

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
const isTrialPlan = computed(() => {
  const subscription = card.value?.subscription;
  if (!subscription) return false;
  return (
    subscription.isTrial ||
    subscription.status === 'trial' ||
    !subscription.planCode
  );
});
const isTrialEndingSoon = computed(() => {
  if (bannerEffectiveStatus.value !== 'trial') return false;
  if (bannerDaysLeft.value === null) return false;
  return bannerDaysLeft.value >= 0;
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
const isTrialExpired = computed(
  () => isSubscriptionExpired.value && isTrialPlan.value
);
const isPaidSubscriptionExpired = computed(
  () => isSubscriptionExpired.value && !isTrialPlan.value
);
const showEndingBanner = computed(
  () =>
    isTrialEndingSoon.value ||
    isSubscriptionEndingSoon.value ||
    isSubscriptionExpired.value
);
const bannerActionText = computed(() =>
  isTrialEndingSoon.value || isTrialExpired.value ? 'extend' : 'renew'
);
const isSubscriptionExpired = computed(
  () => bannerEffectiveStatus.value === 'expired' || bannerDaysLeft.value === 0
);

const showUpgradeButton = computed(() => {
  const planCode = card.value?.subscription?.planCode;
  const isTrial = card.value?.subscription?.isTrial;
  const status = card.value?.subscription?.status;

  if (planCode === 'premium' || planCode === 'founder_club') return false;
  if (isTrial || status === 'trial') return true;
  return planCode === 'standard';
});
const upgradeButtonLabel = computed(() => {
  const isTrial =
    card.value?.subscription?.isTrial ||
    card.value?.subscription?.status === 'trial';
  return isTrial ? 'Upgrade to Premium' : 'Update to Premium';
});

function getCardBadgeLabel(cardData?: CardDTO | null) {
  const planCode = cardData?.subscription?.planCode;
  const isTrial = cardData?.subscription?.isTrial;
  const status = cardData?.subscription?.status;

  if (status === 'pending_approval' || status === 'submitted') {
    return 'Pending';
  }

  if (!planCode || isTrial || status === 'trial') {
    return 'Standard (Trial)';
  }

  if (planCode === 'founder_club') {
    return "Founders' Club";
  }

  if (planCode === 'premium') {
    return 'Premium';
  }

  return 'Standard';
}

const cardBadgeLabel = computed(() => getCardBadgeLabel(card.value));
function getCardBadgeColor(cardData?: CardDTO | null) {
  const status = cardData?.subscription?.status;
  const planCode = cardData?.subscription?.planCode;
  const isTrial = cardData?.subscription?.isTrial;

  if (status === 'pending_approval' || status === 'submitted') {
    return 'bg-amber-500/20 text-amber-300';
  }

  if (!planCode || isTrial || status === 'trial') {
    return 'bg-[#232323] text-white';
  }

  return 'bg-[#232323] text-white';
}
const cardBadgeColor = computed(() => getCardBadgeColor(card.value));
const isPendingBadge = computed(() => {
  const status = card.value?.subscription?.status;
  return status === 'pending_approval' || status === 'submitted';
});

function openPendingInfo() {
  selectedPendingCardName.value =
    `${card.value?.firstName || ''} ${card.value?.lastName || ''}`.trim() ||
    'This card';
  isPendingInfoOpen.value = true;
}

type PaymentScenario =
  | 'trial_to_standard_renewal'
  | 'trial_to_premium_upgrade'
  | 'standard_renewal'
  | 'premium_renewal'
  | 'standard_to_premium_upgrade_active'
  | 'standard_to_premium_upgrade_expired';

const MMK = 'MMK';

type CardPaymentPricingConfig = {
  currency: string;
  standardPlanPriceMinor: number;
  premiumPlanPriceMinor: number;
  customDesignFeeMinor: number;
};

type CreateSubscriptionPaymentPayload = {
  receiptUrl: string;
  note?: string;
  createPremiumRequest?: boolean;
  items: Array<{
    cardId: string;
    planCode: 'standard' | 'premium';
    termYears: number;
    amountMinor: number;
    additionalFeeMinor?: number;
    skipPeriodUpdate?: boolean;
    currency: typeof MMK;
  }>;
};

type CreateSubscriptionPaymentResponse = {
  payment: SelectSubscriptionPayment;
  items: SelectSubscriptionPaymentItem[];
};

const paymentScenario = ref<PaymentScenario | null>(null);
const isPaymentSlideoverOpen = ref(false);
const receiptFile = ref<File | null>(null);
const receiptPreviewUrl = ref<string | null>(null);
const { data: paymentPricing } = useQuery<CardPaymentPricingConfig>({
  queryKey: ['subscription-card-payment-pricing'],
  queryFn: () => $fetch('/api/subscriptions/pricing/card-payment'),
});

const isPremiumUpgradeScenario = computed(
  () =>
    paymentScenario.value === 'trial_to_premium_upgrade' ||
    paymentScenario.value === 'standard_to_premium_upgrade_active' ||
    paymentScenario.value === 'standard_to_premium_upgrade_expired'
);
const targetPlanCode = computed<'standard' | 'premium'>(() => {
  const currentScenario = paymentScenario.value;
  if (
    currentScenario === 'trial_to_standard_renewal' ||
    currentScenario === 'standard_renewal'
  ) {
    return 'standard';
  }

  return 'premium';
});
const shouldSkipPeriodUpdate = computed(
  () => paymentScenario.value === 'standard_to_premium_upgrade_active'
);
const paymentHeaderLabel = computed(() =>
  isPremiumUpgradeScenario.value ? 'Premium Upgrade' : 'Term Renewal'
);
const paymentTitle = computed(() =>
  isPremiumUpgradeScenario.value ? 'Upgrade to Premium' : 'Extend Your Term'
);
const paymentDescription = computed(() => {
  if (isPremiumUpgradeScenario.value) {
    return 'Move your card to premium features and submit payment receipt for review.';
  }

  return 'Keep your card subscription active by extending your term.';
});
const paymentFeeRows = computed(() => {
  const currentScenario = paymentScenario.value;
  const pricing = paymentPricing.value;
  if (!currentScenario || !pricing) return [];

  const rows: { label: string; amountMinor: number; isFree?: boolean }[] = [];

  if (
    currentScenario === 'trial_to_standard_renewal' ||
    currentScenario === 'standard_renewal' ||
    currentScenario === 'premium_renewal'
  ) {
    rows.push({
      label: 'Hosting Fee',
      amountMinor:
        currentScenario === 'premium_renewal'
          ? pricing.premiumPlanPriceMinor
          : pricing.standardPlanPriceMinor,
    });
  }

  if (
    currentScenario === 'trial_to_premium_upgrade' ||
    currentScenario === 'standard_to_premium_upgrade_active' ||
    currentScenario === 'standard_to_premium_upgrade_expired'
  ) {
    rows.push({ label: 'Hosting Fee', amountMinor: 0, isFree: true });
  }

  if (isPremiumUpgradeScenario.value) {
    rows.push({
      label: 'Custom Design Fee',
      amountMinor: pricing.customDesignFeeMinor,
    });
  }

  return rows;
});
const paymentTotalAmountMinor = computed(() =>
  paymentFeeRows.value.reduce((sum, item) => sum + item.amountMinor, 0)
);

function formatMMK(amountMinor: number) {
  const currency = paymentPricing.value?.currency || MMK;
  return `${amountMinor.toLocaleString()} ${currency}`;
}

function formatFeeRowAmount(row: { amountMinor: number; isFree?: boolean }) {
  if (row.isFree) return 'Free of charge';
  return formatMMK(row.amountMinor);
}

function openRenewSlideover() {
  if (!card.value) return;

  if (isTrialPlan.value) {
    paymentScenario.value = 'trial_to_standard_renewal';
  } else if (
    card.value.subscription?.planCode === 'premium' ||
    card.value.subscription?.planCode === 'founder_club'
  ) {
    paymentScenario.value = 'premium_renewal';
  } else {
    paymentScenario.value = 'standard_renewal';
  }

  isPaymentSlideoverOpen.value = true;
}

function openUpgradeSlideover() {
  if (!card.value) return;

  const isTrial =
    card.value.subscription?.isTrial ||
    card.value.subscription?.status === 'trial';
  if (isTrial) {
    paymentScenario.value = 'trial_to_premium_upgrade';
  } else {
    paymentScenario.value = isSubscriptionExpired.value
      ? 'standard_to_premium_upgrade_expired'
      : 'standard_to_premium_upgrade_active';
  }

  isPaymentSlideoverOpen.value = true;
}

watch(receiptFile, (file) => {
  if (receiptPreviewUrl.value) URL.revokeObjectURL(receiptPreviewUrl.value);
  receiptPreviewUrl.value = file ? URL.createObjectURL(file) : null;
});

watch(isPaymentSlideoverOpen, (open) => {
  if (open) return;
  receiptFile.value = null;
  paymentScenario.value = null;
  if (receiptPreviewUrl.value) {
    URL.revokeObjectURL(receiptPreviewUrl.value);
    receiptPreviewUrl.value = null;
  }
});

const { mutate: submitPayment, isPending: isSubmittingPayment } = useMutation({
  mutationFn: async () => {
    if (!cardId.value) {
      throw new Error('Card is not ready.');
    }
    if (!receiptFile.value) {
      throw new Error('Please upload a payment receipt.');
    }
    if (!paymentPricing.value) {
      throw new Error('Pricing is not available yet. Please try again.');
    }

    const compressed = await imageCompression(receiptFile.value, {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1200,
    });

    const { uploadUrl, fileKey } = await $fetch('/api/s3/presigned', {
      method: 'POST',
      body: {
        fileType: compressed.type,
        fileName: receiptFile.value.name,
      },
    });

    await fetch(uploadUrl, {
      method: 'PUT',
      body: compressed,
      headers: { 'Content-Type': compressed.type },
    });

    const payload: CreateSubscriptionPaymentPayload = {
      receiptUrl: fileKey,
      note: `Card detail payment (${paymentScenario.value || 'unknown'})`,
      createPremiumRequest: isPremiumUpgradeScenario.value,
      items: [
        {
          cardId: cardId.value,
          planCode: targetPlanCode.value,
          termYears: 1,
          amountMinor: paymentTotalAmountMinor.value,
          additionalFeeMinor: isPremiumUpgradeScenario.value
            ? paymentPricing.value.customDesignFeeMinor
            : 0,
          skipPeriodUpdate: shouldSkipPeriodUpdate.value,
          currency: paymentPricing.value.currency as typeof MMK,
        },
      ],
    };

    return await $fetch<CreateSubscriptionPaymentResponse, string>(
      '/api/subscriptions/payments',
      {
        method: 'POST',
        body: payload,
      }
    );
  },
  onSuccess: async () => {
    toast.add({
      title: 'Payment submitted',
      description: 'Your payment is now pending approval.',
      color: 'success',
    });

    isPaymentSlideoverOpen.value = false;
    await queryClient.invalidateQueries({ queryKey: ['cards', slug] });
    await queryClient.invalidateQueries({
      queryKey: ['card-subscription', cardId],
    });
  },
  onError: (error: any) => {
    toast.add({
      title: 'Payment failed',
      description:
        error?.data?.statusMessage || error?.message || 'Please try again.',
      color: 'error',
    });
  },
});

function onReceiptChange(event: Event) {
  const input = event.target as HTMLInputElement;
  receiptFile.value = input.files?.[0] || null;
}

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
      class="mt-2 rounded-full bg-white px-5 font-medium text-dark hover:bg-white/90"
      :to="`/platform/${orgSlug}/cards`"
    />
  </div>

  <template v-else>
    <div
      v-if="showEndingBanner"
      class="mb-8 flex items-center justify-center bg-[#232323] px-8 py-4 -mx-6 -mt-4 sm:-mt-6"
    >
      <p
        class="text-center text-sm font-medium uppercase tracking-widest text-white"
      >
        <template v-if="isTrialEndingSoon">
          Your trial period is going to end in
          <span class="font-bold">{{ bannerDaysLeft }}</span>
          {{ bannerDaysLabel }}. Click
          <button class="underline" type="button" @click="openRenewSlideover">
            HERE
          </button>
          to {{ bannerActionText }}.
        </template>
        <template v-else-if="isTrialExpired">
          Your trial period has already ended. Click
          <button class="underline" type="button" @click="openRenewSlideover">
            HERE
          </button>
          to {{ bannerActionText }}.
        </template>
        <template v-else-if="isPaidSubscriptionExpired">
          Your subscription has already ended. Click
          <button class="underline" type="button" @click="openRenewSlideover">
            HERE
          </button>
          to {{ bannerActionText }}.
        </template>
        <template v-else>
          Your subscription is going to end in
          <span class="font-bold">{{ bannerDaysLeft }}</span>
          {{ bannerDaysLabel }}. Click
          <button class="underline" type="button" @click="openRenewSlideover">
            HERE
          </button>
          to renew.
        </template>
      </p>
    </div>

    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div>
        <div class="flex flex-wrap items-center gap-y-2">
          <UButton
            icon="i-lucide-chevron-left"
            size="md"
            color="primary"
            class="bg-transparent mr-2 text-white -mt-[0.15rem] hover:bg-white/10 active:hover:bg-white/20"
            :to="`/platform/${orgSlug}/cards`"
          />
          <h1
            class="text-2xl font-medium tracking-widest uppercase leading-tight"
          >
            {{ card?.firstName }} {{ card?.lastName }}
          </h1>
          <UBadge
            class="uppercase font-semibold ml-3"
            :class="[cardBadgeColor, isPendingBadge ? 'cursor-pointer' : '']"
            size="sm"
            @click="isPendingBadge && openPendingInfo()"
          >
            {{ cardBadgeLabel }}
          </UBadge>
        </div>
        <p class="mt-2 text-sm leading-[20px] text-muted ml-0 sm:ml-10">
          Manage your 3D card information, contact information, QR, and
          wallpapers.
        </p>
      </div>

      <UButton
        v-if="showUpgradeButton"
        :label="upgradeButtonLabel"
        icon="i-lucide-chevrons-up"
        color="neutral"
        class="w-full sm:w-auto rounded-full bg-white px-4 font-medium text-dark hover:bg-white/90"
        @click="openUpgradeSlideover"
      />
    </div>

    <UTabs
      v-model="active"
      :items="items"
      :ui="{
        root: 'items-start mt-6',
        list: 'bg-[#171717] w-full max-w-[32rem] rounded-[8px] p-1 overflow-x-auto',
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

    <USlideover
      v-model:open="isPaymentSlideoverOpen"
      side="right"
      inset
      :dismissible="!isSubmittingPayment"
      :ui="{
        content: 'w-full max-w-[480px] bg-[#171717]',
        header: 'border-b-2 border-[#232323] px-6 py-6',
        title: 'text-sm font-medium tracking-[1.4px] uppercase text-white',
        body: 'px-6 pt-6 pb-8',
      }"
      :title="paymentHeaderLabel"
    >
      <template #body>
        <div class="space-y-8">
          <div class="space-y-4">
            <h3
              class="text-[20px] font-medium uppercase tracking-[2px] text-white"
            >
              {{ paymentTitle }}
            </h3>
            <p class="text-sm leading-[21px] text-[#8b8b8b]">
              {{ paymentDescription }}
            </p>

            <div class="rounded-[4px] border-b border-[#2a2a2a] px-4 py-3">
              <div class="flex items-center justify-between text-sm text-white">
                <span>Duration</span>
                <span class="font-bold">1 Year</span>
              </div>
            </div>
            <div
              v-for="row in paymentFeeRows"
              :key="row.label"
              class="rounded-[4px] px-4 py-3"
            >
              <div class="flex items-center justify-between text-sm text-white">
                <span>{{ row.label }}</span>
                <span class="font-bold">{{ formatFeeRowAmount(row) }}</span>
              </div>
            </div>
          </div>

          <div class="space-y-8">
            <p class="text-sm leading-[21px] text-white">
              Please scan the QR code below to complete your payment.
            </p>

            <div class="space-y-3">
              <p class="text-sm font-medium text-white">KBZ Pay QR Code</p>
              <div
                class="rounded-[6px] border border-[#2a2a2a] bg-[#232323] p-4 text-center"
              >
                <p class="text-sm text-white/50">Scan to Pay</p>
                <div class="mx-auto my-3 size-40 bg-[#d9d9d9]" />
                <p class="text-sm font-bold text-white">
                  {{ formatMMK(paymentTotalAmountMinor) }}
                </p>
              </div>
            </div>

            <div class="space-y-3">
              <p class="text-sm font-medium text-white">
                Upload Payment Receipt
              </p>
              <label
                class="flex h-[132px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[6px] border border-[#2a2a2a] bg-[#232323] p-4"
              >
                <input
                  type="file"
                  class="hidden"
                  accept="image/*"
                  @change="onReceiptChange"
                />
                <UIcon name="i-lucide-upload" class="size-5 text-white" />
                <p class="text-sm text-white">
                  {{ receiptFile ? receiptFile.name : 'Upload Image' }}
                </p>
                <p class="text-sm text-white/50">
                  SVG, JPG, PNG or GIF (max.2MB)
                </p>
              </label>
            </div>

            <p class="text-sm leading-[21px] text-white">
              Once submitted, our team will review your request and reach out
              within 24 hours to confirm the request and schedule the next
              steps.
            </p>
          </div>

          <div class="flex justify-end">
            <UButton
              label="Confirm Payment"
              icon="i-lucide-check"
              color="neutral"
              :loading="isSubmittingPayment"
              :disabled="!receiptFile"
              class="rounded-full bg-white px-6 font-medium text-dark hover:bg-white/90 disabled:opacity-60"
              @click="submitPayment()"
            />
          </div>
        </div>
      </template>
    </USlideover>

    <PendingApprovalInfo
      v-model:open="isPendingInfoOpen"
      :card-name="selectedPendingCardName"
    />
  </template>
</template>
