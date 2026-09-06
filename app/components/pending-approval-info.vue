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
</script>

<template>
  <UModal
    v-model:open="modalOpen"
    title="Pending Approval"
    :ui="{
      content:
        'sm:max-w-[480px] rounded-lg bg-[#171717]',
      title: 'text-sm font-medium uppercase tracking-widest text-white',
      body: 'px-5 py-4 sm:px-6 sm:py-5',
    }"
  >
    <template #body>
      <div class="space-y-4 text-sm leading-relaxed text-[#bcbcbc]">
        <p>
          <span class="font-medium text-white">{{ cardName }}</span>
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
        <p class="text-[#8b8b8b]">
          Need help? Please contact support for verification updates.
        </p>
      </div>
      <div class="flex justify-end">
        <UButton
          size="md"
          label="Got it"
          color="neutral"
          class="h-10 justify-center rounded-full bg-white px-5 font-medium text-dark hover:bg-white/90"
          @click="modalOpen = false"
        />
      </div>
    </template>
  </UModal>
</template>
