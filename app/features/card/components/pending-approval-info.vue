<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean;
    cardName?: string;
  }>(),
  {
    cardName: 'This card',
  }
);

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const modalOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
});

function closeModal() {
  modalOpen.value = false;
}
</script>

<template>
  <UModal
    v-model:open="modalOpen"
    title="Pending Approval"
    :ui="{
      content: 'sm:max-w-[480px] rounded-lg bg-surface',
      title: 'text-sm font-medium uppercase tracking-widest text-ink',
      body: 'px-5 py-4 sm:px-6 sm:py-5',
    }"
  >
    <template #body>
      <div class="space-y-4 text-sm leading-relaxed text-soft">
        <p>
          <span class="font-medium text-ink">{{ cardName }}</span>
          is currently under payment verification.
        </p>
        <p>
          Your card is created and visible now, but some features may stay
          limited until the payment is approved by our team.
        </p>
        <p>
          If a payment is identified as invalid or fraudulent, we reserve the
          right to suspend or remove the card and revoke related access.
        </p>
        <p class="text-subtle">
          Need help? Please contact support for verification updates.
        </p>
      </div>
      <div class="flex justify-end">
        <UButton
          label="Got it"
          color="neutral"
          class="h-10 text-sm justify-center rounded-full bg-ink px-5 font-medium text-ink-inverse hover:bg-ink/90"
          @click="closeModal"
        />
      </div>
    </template>
  </UModal>
</template>
