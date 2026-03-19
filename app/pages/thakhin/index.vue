<script setup lang="ts">
definePageMeta({
  layout: 'thakhin',
});

type PaymentRow = {
  status: string;
  totalAmountMinor: number;
  currency: string | null;
};

const { data, pending } = await useFetch<PaymentRow[]>(
  '/api/subscriptions/payments'
);

const rows = computed(() => data.value || []);

const totalReceivedMinor = computed(() =>
  rows.value
    .filter((row) => row.status === 'approved')
    .reduce((sum, row) => sum + (row.totalAmountMinor || 0), 0)
);

const approvedCount = computed(
  () => rows.value.filter((row) => row.status === 'approved').length
);

const submittedCount = computed(
  () => rows.value.filter((row) => row.status === 'submitted').length
);

const paymentCurrency = computed(
  () => rows.value.find((row) => row.currency)?.currency || 'MMK'
);

function formatMoney(amountMinor: number, currency: string) {
  return `${amountMinor.toLocaleString()} ${currency}`;
}
</script>

<template>
  <div
    class="min-h-[calc(100dvh-7rem)] flex items-center justify-center text-3xl font-bold tracking-tight text-white md:text-5xl"
  >
    {{ formatMoney(totalReceivedMinor, paymentCurrency) }}
  </div>
</template>
