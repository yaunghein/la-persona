<script setup lang="ts">
import type { CardPaymentKind } from '~~/shared/contracts/billing';

const props = defineProps<{
  cardSlug: string;
  /** Receipts are stored with the card's organization. */
  organizationSlug: string;
  kind: CardPaymentKind | null;
}>();

const open = defineModel<boolean>('open', { required: true });
const emit = defineEmits<{ paid: [] }>();

const toast = useToast();
const receiptFile = ref<File | null>(null);
const isUploading = ref(false);

const { data: quote } = useCardPaymentQuoteQuery(
  () => props.cardSlug,
  () => (open.value ? props.kind : null)
);
const { mutateAsync: submitPayment, isPending: isSubmitting } =
  useSubmitCardPaymentMutation(() => props.cardSlug);

const isBusy = computed(() => isUploading.value || isSubmitting.value);
const title = computed(() =>
  props.kind === 'premium_upgrade' ? 'Premium Upgrade' : 'Term Renewal'
);

function formatAmount(amountMinor: number) {
  return `${amountMinor.toLocaleString()} ${quote.value?.currency || 'MMK'}`;
}

watch(open, (isOpen) => {
  if (!isOpen) receiptFile.value = null;
});

async function confirmPayment() {
  if (!props.kind || !receiptFile.value) return;
  isUploading.value = true;
  try {
    const receiptUrl = await uploadImage(
      receiptFile.value,
      { organizationSlug: props.organizationSlug },
      { maxSizeMB: 0.8, maxWidthOrHeight: 1200 }
    );
    isUploading.value = false;
    await submitPayment({ kind: props.kind, receiptUrl });
    toast.add({
      title: 'Payment submitted',
      description: 'Your payment is now pending approval.',
      color: 'success',
    });
    open.value = false;
    emit('paid');
  } catch (error) {
    toast.add({
      title: 'Payment failed',
      description: apiErrorMessage(error),
      color: 'error',
    });
  } finally {
    isUploading.value = false;
  }
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    inset
    :dismissible="!isBusy"
    :title="title"
    :ui="{
      content: 'max-w-[480px] bg-surface',
      header: 'border-b-2 border-raised px-6 py-6',
      title: 'text-sm font-medium tracking-[1.4px] uppercase text-ink',
      body: 'px-6 pt-6 pb-8',
    }"
  >
    <template #body>
      <div class="space-y-8">
        <div>
          <div class="rounded-[4px] border-b border-line px-4 py-3">
            <div class="flex items-center justify-between text-sm text-ink">
              <span>Membership Period</span>
              <span class="font-bold">1 Year</span>
            </div>
          </div>
          <div
            v-for="line in quote?.lines ?? []"
            :key="line.label"
            class="rounded-[4px] border-b border-line px-4 py-3 last:border-b-0"
          >
            <div class="flex items-center justify-between text-sm text-ink">
              <span>{{ line.label }}</span>
              <span class="font-bold">
                {{
                  line.isFree
                    ? 'Free of charge'
                    : formatAmount(line.amountMinor)
                }}
              </span>
            </div>
          </div>
        </div>

        <div class="space-y-8">
          <p class="text-sm leading-5.25 text-muted">
            Please scan the QR code below to complete your payment. Make sure
            that account name is
            <span class="font-bold text-ink">Yan Aung Hein</span>.
          </p>

          <div class="space-y-3">
            <p class="text-sm font-medium text-ink">KBZ Pay QR Code</p>
            <div
              class="rounded-[6px] border border-line bg-raised p-4 text-center"
            >
              <p class="text-sm text-ink/50">Scan to Pay</p>
              <div class="mx-auto my-3 size-40 overflow-hidden bg-[#d9d9d9]">
                <UiSkeletonImage
                  src="/images/kpay.jpg"
                  alt="KBZ Pay QR Code"
                  width="160"
                  class="h-full w-full object-contain"
                />
              </div>
              <p class="text-sm font-bold text-ink">
                {{ quote ? formatAmount(quote.totalAmountMinor) : '—' }}
              </p>
            </div>
          </div>

          <div class="space-y-3">
            <p class="text-sm font-medium text-ink">Upload Payment Receipt</p>
            <UFileUpload
              v-model="receiptFile"
              accept="image/png,image/jpeg,image/webp"
              icon="i-lucide-upload"
              label="Drop your receipt here"
              description="PNG, JPG or WebP"
              class="min-h-42 w-full"
              :ui="{
                root: '[&_img]:object-contain',
                base: 'rounded-[4px] border-line bg-raised',
                label: 'text-sm text-ink',
                description: 'text-xs text-subtle',
              }"
            />
          </div>
        </div>

        <CardNeedHelp />
      </div>
    </template>

    <template #footer>
      <UButton
        label="Confirm Payment"
        leading-icon="i-lucide-check"
        color="neutral"
        :loading="isBusy"
        :disabled="!receiptFile || !quote"
        class="h-10 cursor-pointer rounded-full bg-ink pr-6 pl-5 text-sm font-medium text-ink-inverse hover:bg-ink/90 disabled:opacity-60"
        @click="confirmPayment"
      />
    </template>
  </USlideover>
</template>
