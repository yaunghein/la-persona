<script setup lang="ts">
import type { CardSubscriptionOverview } from '~~/shared/contracts/billing';

const props = defineProps<{ overview: CardSubscriptionOverview }>();
defineEmits<{ renew: [] }>();

const PAID_STATUSES = new Set([
  'active',
  'grace',
  'pending_approval',
  'submitted',
]);
const ENDING_SOON_DAYS = 15;

const daysLeft = computed(() => props.overview.daysLeft);
const daysLabel = computed(() => (daysLeft.value === 1 ? 'DAY' : 'DAYS'));
const isTrialPlan = computed(
  () =>
    props.overview.isTrial ||
    props.overview.status === 'trial' ||
    !props.overview.planCode
);
const isExpired = computed(
  () => props.overview.status === 'expired' || daysLeft.value === 0
);
const isTrialEndingSoon = computed(
  () =>
    props.overview.status === 'trial' &&
    daysLeft.value !== null &&
    daysLeft.value >= 0
);
const isPaidTermEndingSoon = computed(
  () =>
    PAID_STATUSES.has(props.overview.status ?? '') &&
    daysLeft.value !== null &&
    daysLeft.value >= 0 &&
    daysLeft.value <= ENDING_SOON_DAYS
);

const message = computed(() => {
  if (isTrialEndingSoon.value) return 'trial-ending' as const;
  if (isExpired.value) return isTrialPlan.value ? 'trial-ended' : 'term-ended';
  if (isPaidTermEndingSoon.value) return 'term-ending' as const;
  return null;
});
const actionText = computed(() =>
  message.value === 'trial-ending' || message.value === 'trial-ended'
    ? 'extend'
    : 'renew'
);
</script>

<template>
  <div
    v-if="message"
    class="-mx-4 -mt-4 flex items-center justify-center bg-raised px-8 py-2 sm:-mx-6 sm:-mt-6"
  >
    <p
      class="text-center text-xs font-medium uppercase tracking-widest text-ink sm:text-sm"
    >
      <template v-if="message === 'trial-ending'">
        Your trial period is going to end in
        <span class="font-bold">{{ daysLeft }}</span> {{ daysLabel }}.
      </template>
      <template v-else-if="message === 'trial-ended'">
        Your trial period has already ended.
      </template>
      <template v-else-if="message === 'term-ended'">
        Your subscription has already ended.
      </template>
      <template v-else>
        Your subscription is going to end in
        <span class="font-bold">{{ daysLeft }}</span> {{ daysLabel }}.
      </template>
      Click
      <button class="underline" type="button" @click="$emit('renew')">
        HERE
      </button>
      to {{ actionText }}.
    </p>
  </div>
</template>
